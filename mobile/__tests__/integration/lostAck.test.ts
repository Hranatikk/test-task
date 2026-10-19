import { getTestState, resetTestState, setScenario } from '@core/modules/diagnostics';
import { fixturePath } from '../helpers/fixtures';
import { createTestHttpClient } from '../helpers/testControlClient';
import { waitFor } from '../helpers/waitFor';
import { createMemoryStore } from '@core/shared/persistence/memoryStore';
import { noopLogger } from '@core/shared/logger';
import { createHttpClient } from '@core/shared/api/httpClient';
import { createNativeTransport } from '@core/shared/api/nativeTransport';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeFileStager } from '../helpers/nodeFileStager';
import { ImportController, type ImportControllerDeps } from '@core/modules/statement-import';

jest.setTimeout(15000);

describe('lost_ack', () => {
  beforeEach(async () => {
    const http = createTestHttpClient();
    await resetTestState(http);
    await setScenario(http, 'lost_ack');
  });

  it('creates exactly one job even though the first POST response never arrived, and relaunch finds it by key', async () => {
    // Shared persistence across the two "processes": controller A crashes
    // after POST_UNCERTAIN, controller B is built fresh on the same store,
    // simulating a relaunch after the app was killed.
    const persistence = createMemoryStore();
    const stageDir = mkdtempSync(join(tmpdir(), 'stmt-stage-'));
    const baseUrl = process.env.MOCK_BASE!;

    function makeDeps(overrides: Partial<ImportControllerDeps> = {}): ImportControllerDeps {
      const http = createHttpClient(createNativeTransport(createNodeFileStager(stageDir)), baseUrl);
      return {
        persistence,
        http,
        fileStager: createNodeFileStager(stageDir),
        picker: { pick: async () => null, release: async () => {} },
        logger: noopLogger,
        randomKey: () => randomUUID(),
        // Disable the immediate auto-recovery so the uncertain phase after the
        // lost POST is observable before relaunch, matching the diagnostics toggle.
        autoRecoverAfterUncertain: () => false,
        ...overrides,
      };
    }

    const controllerA = new ImportController(
      makeDeps({ picker: { pick: async () => ({ uri: fixturePath('statement.csv'), name: 'statement.csv' }), release: async () => {} } }),
    );
    await controllerA.pickFile();
    await controllerA.confirm();

    expect(controllerA.getState().phase).toBe('uncertain');
    controllerA.dispose();

    // Relaunch: a brand new controller instance hydrates from the same persistence.
    const controllerB = new ImportController(makeDeps());
    expect(controllerB.getState().phase).toBe('uncertain');

    await controllerB.bootstrap();
    await waitFor(() => controllerB.getState().server?.status === 'ready', { timeoutMs: 6000 });

    expect(controllerB.getState().phase).toBe('tracking');
    expect(controllerB.getState().jobId).toBeDefined();

    const controlHttp = createTestHttpClient();
    const state = await getTestState(controlHttp);
    expect(state.stats.newJobs).toBe(1);
  });
});
