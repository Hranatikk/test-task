import { createLogger, type Logger, type LogFields } from '@core/shared/logger';

export interface CapturedLog {
  event: string;
  fields: LogFields;
}

export function createCapturingLogger(): { logger: Logger; calls: CapturedLog[] } {
  const calls: CapturedLog[] = [];
  const logger = createLogger((event, fields) => calls.push({ event, fields }));
  return { logger, calls };
}
