import { acceptStatus } from './acceptStatus';
import { createIdleState, type ImportEvent, type OpState } from './types';

export function reduce(state: OpState, event: ImportEvent): OpState {
  switch (event.type) {
    case 'STAGED':
      return {
        ...state,
        phase: 'staged',
        stagedPath: event.path,
        size: event.size,
        format: event.format,
        displayName: event.displayName,
        rejectReason: undefined,
      };

    case 'REJECTED':
      return {
        ...state,
        phase: 'rejected',
        rejectReason: event.reason,
        stagedPath: undefined,
        displayName: undefined,
      };

    case 'CONFIRMED':
      return { ...state, phase: 'prepared', idempotencyKey: event.key };

    case 'POST_STARTED':
      return { ...state, phase: 'posting' };

    case 'POST_ACCEPTED':
      return { ...state, phase: 'tracking', jobId: event.view.jobId, server: event.view };

    case 'POST_UNCERTAIN':
      return { ...state, phase: 'uncertain' };

    case 'BY_KEY_FOUND':
      return { ...state, phase: 'tracking', jobId: event.view.jobId, server: event.view };

    case 'BY_KEY_NOT_FOUND':
      return { ...state, phase: 'uncertain' };

    case 'POST_FAILED':
      return { ...state, phase: 'failed', errorCode: event.code };

    case 'STATUS': {
      if (!acceptStatus(state, event.view)) return state;
      return {
        ...state,
        server: event.view,
        deletePhase: event.view.status === 'deleted' ? 'confirmed' : state.deletePhase,
      };
    }

    case 'DELETE_REQUESTED':
      return { ...state, deletePhase: 'requested', deleteKey: event.deleteKey };

    case 'DELETE_ACCEPTED': {
      const accepted = acceptStatus(state, event.view);
      return {
        ...state,
        server: accepted ? event.view : state.server,
        deletePhase: event.view.status === 'deleted' ? 'confirmed' : 'accepted',
      };
    }

    case 'DELETE_FAILED':
      return { ...state, deletePhase: 'failed', errorCode: event.code };

    case 'RESET':
      return createIdleState(state.opId);

    default:
      return state;
  }
}
