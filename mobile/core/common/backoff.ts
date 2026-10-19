const POLL_STEPS_MS = [500, 1000, 2000];

export function pollDelay(attempt: number): number {
  const index = Math.min(Math.max(attempt - 1, 0), POLL_STEPS_MS.length - 1);
  return POLL_STEPS_MS[index];
}
