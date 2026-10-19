import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHttpClient } from '@core/shared/api/httpClient';
import { createNativeTransport } from '@core/shared/api/nativeTransport';
import { createMemoryStore } from '@core/shared/persistence/memoryStore';
import { noopLogger } from '@core/shared/logger';
import { ImportController, type ImportControllerDeps, type PickedFile } from '@core/modules/statement-import';
import { createNodeFileStager } from './nodeFileStager';
import { createFakePicker } from './fakePicker';

export function createTestController(
  params: { pickedFile?: PickedFile | null; overrides?: Partial<ImportControllerDeps> } = {},
): ImportController {
  const baseUrl = process.env.MOCK_BASE;
  if (!baseUrl) throw new Error('MOCK_BASE is not set — is globalSetup wired up?');
  const dir = mkdtempSync(join(tmpdir(), 'stmt-stage-'));
  const transport = createNativeTransport(createNodeFileStager(dir));
  const http = createHttpClient(transport, baseUrl);

  const deps: ImportControllerDeps = {
    persistence: createMemoryStore(),
    http,
    fileStager: createNodeFileStager(dir),
    picker: createFakePicker(params.pickedFile ?? null),
    logger: noopLogger,
    randomKey: () => randomUUID(),
    ...params.overrides,
  };
  return new ImportController(deps);
}
