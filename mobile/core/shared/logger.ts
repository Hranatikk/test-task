type Field = 'opId' | 'jobId' | 'status' | 'revision' | 'phase' | 'httpStatus' | 'code' | 'size' | 'format';

export type LogFields = Partial<Record<Field, string | number | undefined>>;

export interface Logger {
  log(event: string, fields?: LogFields): void;
}

/** Never logs file bytes, file names, or transaction descriptions — only the allowlisted fields above. */
export function createLogger(sink: (event: string, fields: LogFields) => void): Logger {
  return { log: (event, fields = {}) => sink(event, fields) };
}

export const noopLogger: Logger = { log: () => {} };
