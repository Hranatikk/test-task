import { pollDelay } from '@core/common/backoff';
import type { HttpClient } from '@core/shared/api/httpClient';
import { getJob } from '../api/importsApi';
import type { JobView } from '../model/types';

export interface PollerDeps {
  http: HttpClient;
  onStatus: (view: JobView) => void;
}

const TERMINAL_STATUSES = new Set(['ready', 'deleted']);

/**
 * Polls GET /imports/{jobId} with backoff. Every start() bumps a generation
 * number; a response that resolves after the poller was stopped or restarted
 * is discarded before it ever reaches the reducer.
 */
export class Poller {
  private epoch = 0;
  private active = false;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;

  constructor(private readonly deps: PollerDeps) {}

  start(jobId: string): void {
    this.stop();
    this.active = true;
    this.attempt = 0;
    const myEpoch = this.epoch;
    this.loop(jobId, myEpoch).catch(() => {});
  }

  stop(): void {
    this.active = false;
    this.epoch += 1;
    this.controller?.abort();
    this.controller = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async loop(jobId: string, myEpoch: number): Promise<void> {
    if (!this.active || myEpoch !== this.epoch) return;
    this.controller = new AbortController();
    const outcome = await getJob(this.deps.http, jobId, this.controller.signal);
    if (myEpoch !== this.epoch) return;

    if (outcome.kind === 'ok') {
      this.deps.onStatus(outcome.view);
      if (TERMINAL_STATUSES.has(outcome.view.status)) {
        this.stop();
        return;
      }
    }

    this.attempt += 1;
    const delay = pollDelay(this.attempt);
    this.timer = setTimeout(() => {
      this.loop(jobId, myEpoch).catch(() => {});
    }, delay);
  }
}
