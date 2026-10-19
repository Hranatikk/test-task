import { encodeHeaderValue } from '@core/common/encodeHeader';
import type { HttpClient } from '@core/shared/api/httpClient';
import type { Logger } from '@core/shared/logger';
import type { KeyValueStore } from '@core/shared/persistence/keyValueStore';
import type { FileStager } from '@core/shared/native/statementFile';
import { createImport, deleteJob as deleteJobRequest, getByKey, getJob } from '../api/importsApi';
import { reduce } from '../model/reducer';
import { createIdleState, type ImportEvent, type OpState } from '../model/types';
import type { FilePicker } from './filePicker';
import { intake } from './fileIntake';
import { Poller } from './poller';

const STORAGE_KEY = 'statement-import:op:v1';

export interface ImportControllerDeps {
  persistence: KeyValueStore;
  http: HttpClient;
  fileStager: FileStager;
  picker: FilePicker;
  logger: Logger;
  randomKey: () => string;
  /** Consulted only right after a POST comes back unresolved; bootstrap always recovers by key regardless. */
  autoRecoverAfterUncertain?: () => boolean;
}

type Listener = (state: OpState) => void;

export class ImportController {
  private state: OpState;
  private readonly listeners = new Set<Listener>();
  private readonly poller: Poller;

  constructor(private readonly deps: ImportControllerDeps) {
    this.state = this.load();
    this.poller = new Poller({
      http: deps.http,
      onStatus: view => {
        this.commit({ type: 'STATUS', view }).catch(() => {});
      },
    });
  }

  getState(): OpState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(): OpState {
    const raw = this.deps.persistence.getString(STORAGE_KEY);
    if (!raw) return createIdleState(this.deps.randomKey());
    try {
      return JSON.parse(raw) as OpState;
    } catch {
      return createIdleState(this.deps.randomKey());
    }
  }

  private async commit(event: ImportEvent): Promise<void> {
    this.state = reduce(this.state, event);
    this.deps.persistence.set(STORAGE_KEY, JSON.stringify(this.state));
    this.deps.logger.log(event.type, {
      opId: this.state.opId,
      jobId: this.state.jobId,
      phase: this.state.phase,
      status: this.state.server?.status,
      revision: this.state.server?.revision,
    });
    for (const listener of this.listeners) listener(this.state);
  }

  async pickFile(): Promise<void> {
    const opId = this.deps.randomKey();
    const result = await intake(this.deps.picker, this.deps.fileStager, opId);
    if (result.kind === 'cancelled') return;

    this.state = createIdleState(opId);
    if (result.kind === 'rejected') {
      await this.commit({ type: 'REJECTED', reason: result.reason });
      return;
    }
    await this.commit({
      type: 'STAGED',
      path: result.path,
      size: result.size,
      format: result.format,
      displayName: result.displayName,
    });
  }

  async cancel(): Promise<void> {
    if (this.state.stagedPath) await this.deps.fileStager.remove(this.state.stagedPath).catch(() => {});
    await this.commit({ type: 'RESET' });
  }

  async confirm(): Promise<void> {
    if (this.state.phase !== 'staged' || !this.state.stagedPath) return;
    const key = this.deps.randomKey();
    await this.commit({ type: 'CONFIRMED', key });
    await this.doPost();
  }

  async retryPost(): Promise<void> {
    if (!this.state.idempotencyKey || !this.state.stagedPath) {
      await this.commit({ type: 'POST_FAILED', code: 'E_NO_FILE' });
      return;
    }
    await this.doPost();
  }

  private async doPost(): Promise<void> {
    const { stagedPath, idempotencyKey, displayName } = this.state;
    if (!stagedPath || !idempotencyKey) return;

    await this.commit({ type: 'POST_STARTED' });
    const outcome = await createImport(this.deps.http, stagedPath, {
      'Content-Type': 'application/octet-stream',
      'Idempotency-Key': idempotencyKey,
      'X-File-Name': encodeHeaderValue(displayName ?? 'statement'),
    });

    if (outcome.kind === 'accepted') {
      await this.commit({ type: 'POST_ACCEPTED', view: outcome.view });
      await this.deps.fileStager.remove(stagedPath).catch(() => {});
      this.poller.start(outcome.view.jobId);
      return;
    }
    if (outcome.kind === 'rejected') {
      await this.commit({ type: 'POST_FAILED', code: String(outcome.status) });
      return;
    }

    await this.commit({ type: 'POST_UNCERTAIN' });
    if (this.deps.autoRecoverAfterUncertain?.() ?? true) {
      await this.recoverByKey();
    }
  }

  /** Manual "check again" action from the uncertain-outcome screen. */
  async recheck(): Promise<void> {
    if (this.state.phase !== 'uncertain') return;
    await this.recoverByKey();
  }

  private async recoverByKey(): Promise<void> {
    const key = this.state.idempotencyKey;
    if (!key) return;
    const outcome = await getByKey(this.deps.http, key);
    if (outcome.kind === 'found') {
      const stagedPath = this.state.stagedPath;
      await this.commit({ type: 'BY_KEY_FOUND', view: outcome.view });
      if (stagedPath) await this.deps.fileStager.remove(stagedPath).catch(() => {});
      this.poller.start(outcome.view.jobId);
    } else if (outcome.kind === 'not_found') {
      await this.commit({ type: 'BY_KEY_NOT_FOUND' });
    }
    // network_error: stay uncertain, caller can retry recheck()/retryPost() later.
  }

  /** Manual "Refresh" on the ready screen — this is how stale_status is observable in the UI. */
  async refresh(): Promise<void> {
    if (!this.state.jobId) return;
    const outcome = await getJob(this.deps.http, this.state.jobId);
    if (outcome.kind === 'ok') await this.commit({ type: 'STATUS', view: outcome.view });
  }

  async delete(): Promise<void> {
    if (!this.state.jobId || this.state.deletePhase === 'confirmed') return;
    const deleteKey = this.state.deleteKey ?? this.deps.randomKey();
    await this.commit({ type: 'DELETE_REQUESTED', deleteKey });
    this.poller.stop();

    const jobId = this.state.jobId;
    const outcome = await deleteJobRequest(this.deps.http, jobId, deleteKey);
    if (outcome.kind === 'accepted') {
      await this.commit({ type: 'DELETE_ACCEPTED', view: outcome.view });
      if (outcome.view.status !== 'deleted') this.poller.start(jobId);
    } else if (outcome.kind === 'rejected') {
      await this.commit({ type: 'DELETE_FAILED', code: String(outcome.status) });
    } else {
      await this.commit({ type: 'DELETE_FAILED', code: 'E_NETWORK' });
    }
  }

  /** Same action as delete(): it already reuses the stored deleteKey when present. */
  async retryDelete(): Promise<void> {
    await this.delete();
  }

  /** Wipes local state and any staged copy. Never touches the server. */
  async resetLocal(): Promise<void> {
    this.poller.stop();
    if (this.state.stagedPath) await this.deps.fileStager.remove(this.state.stagedPath).catch(() => {});
    this.state = createIdleState(this.deps.randomKey());
    this.deps.persistence.delete(STORAGE_KEY);
    for (const listener of this.listeners) listener(this.state);
  }

  /** Called once at app start, after store hydration and before the first render of the import screen. */
  async bootstrap(): Promise<void> {
    await this.deps.fileStager.sweep(this.state.stagedPath ? [this.state.stagedPath] : []).catch(() => 0);

    switch (this.state.phase) {
      case 'staged':
      case 'rejected': {
        if (this.state.stagedPath) await this.deps.fileStager.remove(this.state.stagedPath).catch(() => {});
        await this.commit({ type: 'RESET' });
        return;
      }
      case 'prepared':
      case 'posting':
      case 'uncertain': {
        await this.commit({ type: 'POST_UNCERTAIN' });
        await this.recoverByKey();
        return;
      }
      case 'tracking': {
        if (this.state.deletePhase === 'requested' || this.state.deletePhase === 'accepted') {
          await this.checkDeleteOnBoot();
        } else if (this.state.jobId) {
          this.poller.start(this.state.jobId);
        }
        return;
      }
      default:
        return;
    }
  }

  private async checkDeleteOnBoot(): Promise<void> {
    const jobId = this.state.jobId;
    if (!jobId) return;
    const outcome = await getJob(this.deps.http, jobId);
    if (outcome.kind === 'ok' && (outcome.view.status === 'deleting' || outcome.view.status === 'deleted')) {
      await this.commit({ type: 'STATUS', view: outcome.view });
      if (outcome.view.status === 'deleting') this.poller.start(jobId);
      return;
    }
    await this.commit({
      type: 'DELETE_FAILED',
      code: outcome.kind === 'rejected' ? String(outcome.status) : 'E_UNKNOWN',
    });
  }

  dispose(): void {
    this.poller.stop();
  }
}
