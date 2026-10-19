import type { RecurringItem } from '@core/modules/statement-import';

export interface OverlayState {
  details: RecurringItem | null;
  confirmDelete: boolean;
  toast: string | null;
}

type Listener = (state: OverlayState) => void;

let state: OverlayState = { details: null, confirmDelete: false, toast: null };
const listeners = new Set<Listener>();
let confirmResolver: ((value: boolean) => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<OverlayState>): void {
  state = { ...state, ...patch };
  emit();
}

export const overlayManager = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  },

  getState(): OverlayState {
    return state;
  },

  showDetails(item: RecurringItem): void {
    setState({ details: item });
  },

  hideDetails(): void {
    setState({ details: null });
  },

  /** Resolves true if the user confirmed, false if they dismissed. */
  confirmDelete(): Promise<boolean> {
    setState({ confirmDelete: true });
    return new Promise<boolean>(resolve => {
      confirmResolver = resolve;
    });
  },

  resolveConfirmDelete(value: boolean): void {
    setState({ confirmDelete: false });
    confirmResolver?.(value);
    confirmResolver = null;
  },

  showToast(message: string, durationMs = 3000): void {
    if (toastTimer) clearTimeout(toastTimer);
    setState({ toast: message });
    toastTimer = setTimeout(() => setState({ toast: null }), durationMs);
  },

  hideToast(): void {
    if (toastTimer) clearTimeout(toastTimer);
    setState({ toast: null });
  },
};
