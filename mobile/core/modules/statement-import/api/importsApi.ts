import type { HttpClient } from '@core/shared/api/httpClient';
import type { JobView } from '../model/types';

export type CreateOutcome =
  | { kind: 'accepted'; view: JobView }
  | { kind: 'rejected'; status: number }
  | { kind: 'network_error' };

export type ByKeyOutcome = { kind: 'found'; view: JobView } | { kind: 'not_found' } | { kind: 'network_error' };

export type JobOutcome = { kind: 'ok'; view: JobView } | { kind: 'rejected'; status: number } | { kind: 'network_error' };

export type DeleteOutcome =
  | { kind: 'accepted'; view: JobView }
  | { kind: 'rejected'; status: number }
  | { kind: 'network_error' };

export async function createImport(
  http: HttpClient,
  filePath: string,
  headers: Record<string, string>,
): Promise<CreateOutcome> {
  try {
    const r = await http.uploadFile('/imports', filePath, headers);
    if (r.status === 202) return { kind: 'accepted', view: JSON.parse(r.body) as JobView };
    return { kind: 'rejected', status: r.status };
  } catch {
    return { kind: 'network_error' };
  }
}

export async function getByKey(http: HttpClient, key: string): Promise<ByKeyOutcome> {
  try {
    const r = await http.get(`/imports/by-key/${encodeURIComponent(key)}`);
    if (r.status === 200) return { kind: 'found', view: JSON.parse(r.body) as JobView };
    if (r.status === 404) return { kind: 'not_found' };
    return { kind: 'network_error' };
  } catch {
    return { kind: 'network_error' };
  }
}

export async function getJob(http: HttpClient, jobId: string, signal?: AbortSignal): Promise<JobOutcome> {
  try {
    const r = await http.get(`/imports/${jobId}`, signal);
    if (r.status === 200) return { kind: 'ok', view: JSON.parse(r.body) as JobView };
    return { kind: 'rejected', status: r.status };
  } catch {
    return { kind: 'network_error' };
  }
}

export async function deleteJob(http: HttpClient, jobId: string, deleteKey: string): Promise<DeleteOutcome> {
  try {
    const r = await http.delete(`/imports/${jobId}`, { 'Idempotency-Key': deleteKey });
    if (r.status === 202) return { kind: 'accepted', view: JSON.parse(r.body) as JobView };
    return { kind: 'rejected', status: r.status };
  } catch {
    return { kind: 'network_error' };
  }
}
