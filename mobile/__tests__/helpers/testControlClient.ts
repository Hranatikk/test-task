import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHttpClient, type HttpClient } from '@core/shared/api/httpClient';
import { createNativeTransport } from '@core/shared/api/nativeTransport';
import { createNodeFileStager } from './nodeFileStager';

export function createTestHttpClient(): HttpClient {
  const baseUrl = process.env.MOCK_BASE;
  if (!baseUrl) throw new Error('MOCK_BASE is not set — is globalSetup wired up?');
  const dir = mkdtempSync(join(tmpdir(), 'stmt-control-'));
  return createHttpClient(createNativeTransport(createNodeFileStager(dir)), baseUrl);
}

export function randomKey(): string {
  return randomUUID();
}
