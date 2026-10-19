import type { JobView, OpState } from './types';

export function acceptStatus(s: OpState, v: JobView): boolean {
  if (s.jobId && v.jobId !== s.jobId) return false;
  const deleteIntent = s.deletePhase !== 'none';
  if (deleteIntent && v.status !== 'deleting' && v.status !== 'deleted') return false;
  if (s.server && v.revision <= s.server.revision) return false;
  return true;
}
