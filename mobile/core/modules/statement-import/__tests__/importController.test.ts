import { createMemoryStore } from '@core/shared/persistence/memoryStore';
import type { HttpClient } from '@core/shared/api/httpClient';
import type { FileStager } from '@core/shared/native/statementFile';
import { createCapturingLogger } from '../../../../__tests__/helpers/testLogger';
import { ImportController, type ImportControllerDeps } from '../service/importController';
import type { FilePicker } from '../service/filePicker';
import type { KeyValueStore } from '@core/shared/persistence/keyValueStore';

const SECRET_NAME = 'секретная-выписка.csv';

function fakeFileStager(): FileStager {
  return {
    stage: async (_uri, opId) => ({ path: `/tmp/${opId}.bin`, size: 42, head: [0x25, 0x50, 0x44, 0x46, 0x2d] }),
    upload: async () => ({ status: 202, body: JSON.stringify({ jobId: 'job-demo-001', status: 'queued', revision: 1 }) }),
    remove: async () => {},
    sweep: async () => 0,
    randomKey: () => 'native-key',
  };
}

function fakePicker(): FilePicker {
  return {
    pick: async () => ({ uri: 'content://fake/statement.csv', name: SECRET_NAME }),
    release: async () => {},
  };
}

function baseDeps(overrides: Partial<ImportControllerDeps> = {}): ImportControllerDeps {
  const { logger } = createCapturingLogger();
  let counter = 0;
  return {
    persistence: createMemoryStore(),
    http: {} as HttpClient,
    fileStager: fakeFileStager(),
    picker: fakePicker(),
    logger,
    randomKey: () => `key-${++counter}`,
    ...overrides,
  };
}

describe('ImportController: persist-then-act', () => {
  it('writes the idempotency key to storage before the upload call is made', async () => {
    const persistence: KeyValueStore = createMemoryStore();
    let sawPersistedKeyBeforeUpload = false;

    const http: HttpClient = {
      baseUrl: 'http://test',
      uploadFile: async (_path, _filePath, headers) => {
        // By the time the network call fires, CONFIRMED (persist key) and
        // POST_STARTED (persist phase: posting) have already been written.
        const raw = persistence.getString('statement-import:op:v1');
        const state = raw ? JSON.parse(raw) : null;
        sawPersistedKeyBeforeUpload = state?.phase === 'posting' && state?.idempotencyKey === headers['Idempotency-Key'];
        return { status: 202, body: JSON.stringify({ jobId: 'job-demo-001', status: 'queued', revision: 1 }) };
      },
      get: async () => ({ status: 200, body: JSON.stringify({ jobId: 'job-demo-001', status: 'queued', revision: 1 }) }),
      post: async () => ({ status: 200, body: '{}' }),
      delete: async () => ({ status: 202, body: '{}' }),
    };

    const controller = new ImportController(baseDeps({ persistence, http }));
    await controller.pickFile();
    await controller.confirm();
    controller.dispose();

    expect(sawPersistedKeyBeforeUpload).toBe(true);
  });

  it('after a relaunch, recovers the job by key without uploading the file again', async () => {
    const persistence = createMemoryStore();
    let uploadCalls = 0;

    const httpA: HttpClient = {
      baseUrl: 'http://test',
      uploadFile: async () => {
        uploadCalls += 1;
        throw new Error('connection reset');
      },
      get: async () => ({ status: 404, body: '{}' }),
      post: async () => ({ status: 200, body: '{}' }),
      delete: async () => ({ status: 202, body: '{}' }),
    };

    const controllerA = new ImportController(
      baseDeps({ persistence, http: httpA, autoRecoverAfterUncertain: () => false }),
    );
    await controllerA.pickFile();
    await controllerA.confirm();
    expect(controllerA.getState().phase).toBe('uncertain');
    controllerA.dispose();

    const httpB: HttpClient = {
      baseUrl: 'http://test',
      uploadFile: async () => {
        uploadCalls += 1;
        throw new Error('should not be called again');
      },
      get: async () => ({ status: 200, body: JSON.stringify({ jobId: 'job-demo-001', status: 'queued', revision: 1 }) }),
      post: async () => ({ status: 200, body: '{}' }),
      delete: async () => ({ status: 202, body: '{}' }),
    };

    const controllerB = new ImportController(baseDeps({ persistence, http: httpB }));
    await controllerB.bootstrap();

    expect(controllerB.getState().phase).toBe('tracking');
    expect(controllerB.getState().jobId).toBe('job-demo-001');
    expect(uploadCalls).toBe(1);
    controllerB.dispose();
  });

  it('never logs the file name', async () => {
    const { logger, calls } = createCapturingLogger();
    const http: HttpClient = {
      baseUrl: 'http://test',
      uploadFile: async () => ({ status: 202, body: JSON.stringify({ jobId: 'job-demo-001', status: 'queued', revision: 1 }) }),
      get: async () => ({ status: 200, body: JSON.stringify({ jobId: 'job-demo-001', status: 'ready', revision: 3 }) }),
      post: async () => ({ status: 200, body: '{}' }),
      delete: async () => ({ status: 202, body: '{}' }),
    };

    const controller = new ImportController(baseDeps({ http, logger: logger }));
    await controller.pickFile();
    await controller.confirm();
    controller.dispose();

    expect(JSON.stringify(calls)).not.toContain(SECRET_NAME);
  });
});
