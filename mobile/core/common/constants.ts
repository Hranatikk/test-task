export const MAX_BYTES = 10 * 1024 * 1024;
export const HEAD_BYTES = 32;

export const REVISION = {
  queued: 1,
  processing: 2,
  ready: 3,
  deleting: 4,
  deleted: 5,
} as const;
