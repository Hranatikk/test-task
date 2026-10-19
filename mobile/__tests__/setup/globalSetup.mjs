import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockServer } from '../../../kit/mock-server.mjs';

export default async () => {
  const dir = mkdtempSync(join(tmpdir(), 'stmt-mock-'));
  const server = createMockServer({ statePath: join(dir, 'state.json') });
  await new Promise(resolve => server.listen(8799, '127.0.0.1', resolve));
  globalThis.__MOCK__ = { server, dir };
  process.env.MOCK_BASE = 'http://127.0.0.1:8799';
};
