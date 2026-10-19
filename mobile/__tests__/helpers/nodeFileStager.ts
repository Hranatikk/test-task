import { randomUUID } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import type { FileStager } from '@core/shared/native/statementFile';

/**
 * Node fs-based stand-in for the native StatementFile module: same contract
 * (streaming size cap before copying, upload straight from the staged path,
 * remove/sweep), used by Node tests instead of the real Kotlin/Obj-C++ code.
 */
export function createNodeFileStager(dir: string): FileStager {
  mkdirSync(dir, { recursive: true });

  return {
    async stage(sourceUri, opId, maxBytes) {
      const size = statSync(sourceUri).size;
      if (size > maxBytes) {
        throw Object.assign(new Error('too large'), { code: 'E_TOO_LARGE' });
      }
      if (size === 0) {
        throw Object.assign(new Error('empty'), { code: 'E_EMPTY' });
      }
      const path = join(dir, `${opId}.bin`);
      copyFileSync(sourceUri, path);
      const buffer = Buffer.alloc(32);
      const fd = openSync(path, 'r');
      const read = readSync(fd, buffer, 0, 32, 0);
      closeSync(fd);
      return { path, size, head: Array.from(buffer.subarray(0, read)) };
    },

    async upload(url, path, headers, _timeoutMs) {
      const body = readFileSync(path);
      const response = await fetch(url, { method: 'POST', headers, body });
      const text = await response.text();
      return { status: response.status, body: text };
    },

    async remove(path) {
      if (existsSync(path)) rmSync(path, { force: true });
    },

    async sweep(keepPaths) {
      const keep = new Set(keepPaths);
      let removed = 0;
      if (!existsSync(dir)) return removed;
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (!keep.has(path)) {
          rmSync(path, { force: true });
          removed += 1;
        }
      }
      return removed;
    },

    randomKey() {
      return randomUUID();
    },
  };
}
