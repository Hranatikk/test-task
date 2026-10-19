import { resetTestState, setScenario, getTestState } from '@core/modules/diagnostics';
import { fixturePath } from '../helpers/fixtures';
import { createTestController } from '../helpers/testController';
import { createTestHttpClient } from '../helpers/testControlClient';

jest.setTimeout(15000);

describe('spoofed + oversize', () => {
  beforeEach(async () => {
    const http = createTestHttpClient();
    await resetTestState(http);
    await setScenario(http, 'happy');
  });

  it('rejects both bad fixtures before any POST reaches the server', async () => {
    const controlHttp = createTestHttpClient();
    const before = await getTestState(controlHttp);

    const spoofed = createTestController({ pickedFile: { uri: fixturePath('spoofed.pdf'), name: 'spoofed.pdf' } });
    await spoofed.pickFile();
    expect(spoofed.getState().phase).toBe('rejected');
    expect(spoofed.getState().rejectReason).toBe('not_pdf_or_csv');

    const oversize = createTestController({ pickedFile: { uri: fixturePath('oversize.csv'), name: 'oversize.csv' } });
    await oversize.pickFile();
    expect(oversize.getState().phase).toBe('rejected');
    expect(oversize.getState().rejectReason).toBe('too_large');

    const after = await getTestState(controlHttp);
    expect(after.stats.createRequests).toBe(before.stats.createRequests);
  });
});
