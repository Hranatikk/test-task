import { resetTestState, setScenario } from '@core/modules/diagnostics';
import { fixturePath } from '../helpers/fixtures';
import { createTestController } from '../helpers/testController';
import { createTestHttpClient } from '../helpers/testControlClient';
import { waitFor } from '../helpers/waitFor';

jest.setTimeout(15000);

describe('stale_status', () => {
  beforeEach(async () => {
    const http = createTestHttpClient();
    await resetTestState(http);
    await setScenario(http, 'stale_status');
  });

  it('does not roll the UI back when a lower-revision status arrives after ready', async () => {
    const controller = createTestController({
      pickedFile: { uri: fixturePath('statement.csv'), name: 'statement.csv' },
    });
    await controller.pickFile();
    await controller.confirm();
    await waitFor(() => controller.getState().server?.status === 'ready', { timeoutMs: 6000 });
    expect(controller.getState().server?.revision).toBe(3);

    // In stale_status mode the mock returns processing/revision 2 on the
    // second GET against /imports/{jobId} — refresh() issues exactly that GET.
    await controller.refresh();

    const state = controller.getState();
    expect(state.server?.status).toBe('ready');
    expect(state.server?.revision).toBe(3);
  });
});
