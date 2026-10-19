import { rmSync } from 'node:fs';

export default async () => {
  const mock = globalThis.__MOCK__;
  if (!mock) return;
  await new Promise(resolve => mock.server.close(resolve));
  rmSync(mock.dir, { recursive: true, force: true });
};
