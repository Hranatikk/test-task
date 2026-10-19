import type { Transport, TransportResponse } from './transport';

export interface HttpClient {
  readonly baseUrl: string;
  uploadFile(path: string, filePath: string, headers: Record<string, string>): Promise<TransportResponse>;
  get(path: string, signal?: AbortSignal): Promise<TransportResponse>;
  post(path: string, headers?: Record<string, string>, body?: string): Promise<TransportResponse>;
  delete(path: string, headers: Record<string, string>): Promise<TransportResponse>;
}

export function createHttpClient(transport: Transport, baseUrl: string): HttpClient {
  const url = (path: string) => `${baseUrl}${path}`;
  return {
    baseUrl,
    uploadFile: (path, filePath, headers) => transport.uploadFile(url(path), filePath, headers),
    get: (path, signal) => transport.request('GET', url(path), undefined, undefined, signal),
    post: (path, headers, body) => transport.request('POST', url(path), headers, body),
    delete: (path, headers) => transport.request('DELETE', url(path), headers),
  };
}
