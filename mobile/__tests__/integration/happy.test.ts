import { resetTestState, setScenario, getTestState } from '@core/modules/diagnostics';
import { fixturePath } from '../helpers/fixtures';
import { createTestController } from '../helpers/testController';
import { createTestHttpClient } from '../helpers/testControlClient';
import { waitFor } from '../helpers/waitFor';

jest.setTimeout(15000);

describe('happy', () => {
  beforeEach(async () => {
    const http = createTestHttpClient();
    await resetTestState(http);
    await setScenario(http, 'happy');
  });

  it('sends real bytes, does not call 202 a finished report, and shows the ready items once the server says ready', async () => {
    const controlHttp = createTestHttpClient();
    const before = await getTestState(controlHttp);

    const controller = createTestController({
      pickedFile: { uri: fixturePath('statement.csv'), name: 'statement.csv' },
    });

    await controller.pickFile();
    expect(controller.getState().phase).toBe('staged');

    await controller.confirm();
    // 202/queued must never be presented as the finished report.
    expect(controller.getState().server?.status).not.toBe('ready');
    expect(['posting', 'tracking']).toContain(controller.getState().phase);

    await waitFor(() => controller.getState().server?.status === 'ready', { timeoutMs: 6000 });

    const state = controller.getState();
    expect(state.phase).toBe('tracking');
    expect(state.server?.currency).toBe('AUD');
    expect(state.server?.items).toHaveLength(2);
    const total = state.server!.items!.reduce((sum, item) => sum + item.amountMinor, 0);
    expect(total).toBe(15199);

    const after = await getTestState(controlHttp);
    expect(after.stats.newJobs).toBe(before.stats.newJobs + 1);
  });

  it('accepts statement.pdf the same way', async () => {
    const controller = createTestController({
      pickedFile: { uri: fixturePath('statement.pdf'), name: 'statement.pdf' },
    });
    await controller.pickFile();
    expect(controller.getState().format).toBe('pdf');
    await controller.confirm();
    await waitFor(() => controller.getState().server?.status === 'ready', { timeoutMs: 6000 });
    expect(controller.getState().server?.items).toHaveLength(2);
  });
});
