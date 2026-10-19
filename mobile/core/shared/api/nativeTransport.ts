import type { FileStager } from '../native/statementFile';
import type { Transport, TransportResponse } from './transport';

const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Transport backed by the native FileStager for uploads (reads bytes straight
 * from disk, never through JS) and `fetch` for plain JSON requests. Has no
 * react-native import itself, so it is exercised directly in Node tests
 * against a fake FileStager.
 */
export function createNativeTransport(stager: FileStager): Transport {
  return {
    uploadFile: (url, path, headers) => stager.upload(url, path, headers, UPLOAD_TIMEOUT_MS),
    request: async (method, url, headers = {}, body, signal): Promise<TransportResponse> => {
      const response = await fetch(url, { method, headers, body, signal });
      const text = await response.text();
      return { status: response.status, body: text };
    },
  };
}
