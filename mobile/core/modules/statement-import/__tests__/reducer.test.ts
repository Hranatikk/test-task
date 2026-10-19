import { REVISION } from '@core/common/constants';
import { reduce } from '../model/reducer';
import { createIdleState, type JobView, type OpState } from '../model/types';

function view(status: JobView['status'], revision: number, jobId = 'job-demo-001'): JobView {
  return { jobId, status, revision };
}

function trackingState(server: JobView): OpState {
  return {
    ...createIdleState('op-1'),
    phase: 'tracking',
    jobId: server.jobId,
    server,
  };
}

describe('reduce: status revisions', () => {
  it('accepts monotonically increasing revisions', () => {
    let state: OpState = {
      ...createIdleState('op-1'),
      phase: 'tracking',
      jobId: 'job-demo-001',
    };
    state = reduce(state, { type: 'STATUS', view: view('queued', REVISION.queued) });
    expect(state.server?.revision).toBe(1);
    state = reduce(state, { type: 'STATUS', view: view('processing', REVISION.processing) });
    expect(state.server?.revision).toBe(2);
    state = reduce(state, { type: 'STATUS', view: view('ready', REVISION.ready) });
    expect(state.server?.revision).toBe(3);
  });

  it('ignores a stale processing/2 arriving after ready/3', () => {
    const state = trackingState(view('ready', REVISION.ready));
    const next = reduce(state, { type: 'STATUS', view: view('processing', REVISION.processing) });
    expect(next).toBe(state);
    expect(next.server?.status).toBe('ready');
  });

  it('ignores a status for a different jobId than the one being tracked', () => {
    const state = trackingState(view('ready', REVISION.ready));
    const next = reduce(state, {
      type: 'STATUS',
      view: view('ready', REVISION.ready + 1, 'job-demo-999'),
    });
    expect(next).toBe(state);
  });
});

describe('reduce: delete intent overrides late non-delete statuses', () => {
  it('ignores a late ready/3 after deleting/4 was observed', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: 'del-key-12345678' });
    state = reduce(state, {
      type: 'DELETE_ACCEPTED',
      view: view('deleting', REVISION.deleting),
    });
    expect(state.deletePhase).toBe('accepted');
    expect(state.server?.status).toBe('deleting');

    const stale = reduce(state, { type: 'STATUS', view: view('ready', REVISION.ready) });
    expect(stale).toBe(state);
  });

  it('blocks a non-delete status even if it carries a higher revision than the current one', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: 'del-key-12345678' });
    const blocked = reduce(state, {
      type: 'STATUS',
      view: { jobId: 'job-demo-001', status: 'processing', revision: 99 },
    });
    expect(blocked).toBe(state);
  });

  it('a failed delete (503) does not claim confirmation and keeps the delete key', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: 'del-key-12345678' });
    state = reduce(state, { type: 'DELETE_FAILED', code: '503' });
    expect(state.deletePhase).toBe('failed');
    expect(state.deleteKey).toBe('del-key-12345678');
  });

  it('confirms deletion only once the server reports deleted/5', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: 'del-key-12345678' });
    state = reduce(state, { type: 'DELETE_ACCEPTED', view: view('deleting', REVISION.deleting) });
    expect(state.deletePhase).toBe('accepted');
    state = reduce(state, { type: 'STATUS', view: view('deleted', REVISION.deleted) });
    expect(state.deletePhase).toBe('confirmed');
  });

  it('retrying a failed delete and succeeding reaches confirmed with the same key', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: 'del-key-12345678' });
    state = reduce(state, { type: 'DELETE_FAILED', code: '503' });
    state = reduce(state, { type: 'DELETE_REQUESTED', deleteKey: state.deleteKey! });
    state = reduce(state, { type: 'DELETE_ACCEPTED', view: view('deleted', REVISION.deleted) });
    expect(state.deletePhase).toBe('confirmed');
    expect(state.deleteKey).toBe('del-key-12345678');
  });
});

describe('reduce: staging and posting lifecycle', () => {
  it('moves staged -> rejected without keeping the staged path', () => {
    let state = createIdleState('op-1');
    state = reduce(state, {
      type: 'STAGED',
      path: '/tmp/op-1.bin',
      size: 10,
      format: 'csv',
      displayName: 'statement.csv',
    });
    expect(state.phase).toBe('staged');
    state = reduce(state, { type: 'REJECTED', reason: 'too_large' });
    expect(state.phase).toBe('rejected');
    expect(state.stagedPath).toBeUndefined();
    expect(state.rejectReason).toBe('too_large');
  });

  it('persists the idempotency key on CONFIRMED before any network event', () => {
    let state = createIdleState('op-1');
    state = reduce(state, {
      type: 'STAGED',
      path: '/tmp/op-1.bin',
      size: 10,
      format: 'pdf',
      displayName: 'statement.pdf',
    });
    state = reduce(state, { type: 'CONFIRMED', key: 'idem-key-12345678' });
    expect(state.phase).toBe('prepared');
    expect(state.idempotencyKey).toBe('idem-key-12345678');
  });

  it('BY_KEY_NOT_FOUND normalizes an in-flight op into uncertain', () => {
    let state = createIdleState('op-1');
    state = reduce(state, { type: 'CONFIRMED', key: 'idem-key-12345678' });
    state = reduce(state, { type: 'POST_STARTED' });
    state = reduce(state, { type: 'BY_KEY_NOT_FOUND' });
    expect(state.phase).toBe('uncertain');
  });

  it('RESET clears the operation back to idle but keeps the same opId', () => {
    let state = trackingState(view('ready', REVISION.ready));
    state = reduce(state, { type: 'RESET' });
    expect(state.phase).toBe('idle');
    expect(state.opId).toBe('op-1');
    expect(state.server).toBeUndefined();
    expect(state.deletePhase).toBe('none');
  });
});
