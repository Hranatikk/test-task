export interface TransportResponse {
  status: number;
  body: string;
}

export type HttpMethod = 'GET' | 'DELETE' | 'POST';

export interface Transport {
  /** Uploads raw bytes read from `path` on disk; never loads the whole file into JS memory. */
  uploadFile(url: string, path: string, headers: Record<string, string>): Promise<TransportResponse>;
  request(
    method: HttpMethod,
    url: string,
    headers?: Record<string, string>,
    body?: string,
    signal?: AbortSignal,
  ): Promise<TransportResponse>;
}
