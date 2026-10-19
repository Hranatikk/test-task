export interface StageResult {
  path: string;
  size: number;
  /** First HEAD_BYTES bytes of the staged file, used for content sniffing. */
  head: number[];
}

export interface UploadResult {
  status: number;
  body: string;
}

/**
 * Bridge to the native StatementFile module: streaming copy with a hard size
 * cap, upload straight from disk, and cleanup. Implemented natively on-device
 * (Turbo Module) and by a Node fs-based fake in tests.
 */
export interface FileStager {
  stage(sourceUri: string, opId: string, maxBytes: number): Promise<StageResult>;
  upload(url: string, path: string, headers: Record<string, string>, timeoutMs: number): Promise<UploadResult>;
  remove(path: string): Promise<void>;
  sweep(keepPaths: string[]): Promise<number>;
  randomKey(): string;
}

export type StatementFileErrorCode =
  | 'E_TOO_LARGE'
  | 'E_UNREADABLE'
  | 'E_EMPTY'
  | 'E_NETWORK'
  | 'E_TIMEOUT'
  | 'E_IO';

const KNOWN_CODES: readonly StatementFileErrorCode[] = [
  'E_TOO_LARGE',
  'E_UNREADABLE',
  'E_EMPTY',
  'E_NETWORK',
  'E_TIMEOUT',
  'E_IO',
];

export function statementFileErrorCode(error: unknown): StatementFileErrorCode | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return KNOWN_CODES.includes(code as StatementFileErrorCode) ? (code as StatementFileErrorCode) : undefined;
}
