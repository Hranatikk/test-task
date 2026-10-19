import { resetTestState, setScenario, getTestState } from '@core/modules/diagnostics';
import { fixturePath } from '../helpers/fixtures';
import { createTestController } from '../helpers/testController';
import { createTestHttpClient } from '../helpers/testControlClient';
import { waitFor } from '../helpers/waitFor';

jest.setTimeout(15000);

describe('delete_failure', () => {
  it('never claims the server copy is deleted until a GET confirms it, and recovers after switching back to happy', async () => {
    const controlHttp = createTestHttpClient();
    await resetTestState(controlHttp);
    await setScenario(controlHttp, 'delete_failure');

    const controller = createTestController({
      pickedFile: { uri: fixturePath('statement.csv'), name: 'statement.csv' },
    });
    await controller.pickFile();
    await controller.confirm();
    await waitFor(() => controller.getState().server?.status === 'ready', { timeoutMs: 6000 });

    await controller.delete();
    expect(controller.getState().deletePhase).toBe('failed');
    expect(controller.getState().server?.status).not.toBe('deleted');

    await setScenario(controlHttp, 'happy');
    await controller.retryDelete();

    await waitFor(() => controller.getState().deletePhase === 'confirmed', { timeoutMs: 6000 });
    expect(controller.getState().server?.status).toBe('deleted');

    const state = await getTestState(controlHttp);
    expect(state.stats.deleteRequests).toBe(2);
  });
});
