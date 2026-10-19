import type { HttpClient } from '@core/shared/api/httpClient';

export type ScenarioMode = 'happy' | 'lost_ack' | 'stale_status' | 'delete_failure';

export interface TestStats {
  createRequests: number;
  newJobs: number;
  duplicateHits: number;
  acceptedBytes: number;
  deleteRequests: number;
}

export interface TestJobSnapshot {
  jobId: string;
  status: string;
  revision: number;
  sha256: string;
  bytes: number;
}

export interface TestState {
  mode: ScenarioMode;
  stats: TestStats;
  jobs: TestJobSnapshot[];
}

export async function setScenario(http: HttpClient, mode: ScenarioMode): Promise<void> {
  await http.post('/__test/scenario', { 'Content-Type': 'application/json' }, JSON.stringify({ mode }));
}

export async function getTestState(http: HttpClient): Promise<TestState> {
  const r = await http.get('/__test/state');
  return JSON.parse(r.body) as TestState;
}

export async function resetTestState(http: HttpClient): Promise<void> {
  await http.post('/__test/reset');
}
