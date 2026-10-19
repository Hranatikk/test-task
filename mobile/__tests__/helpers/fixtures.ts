import { join } from 'node:path';

export const FIXTURES_DIR = join(__dirname, '../../../kit/fixtures');

export function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}
