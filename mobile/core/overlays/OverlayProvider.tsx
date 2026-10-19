import React, { useEffect, useState, type PropsWithChildren } from 'react';
import { overlayManager, type OverlayState } from './overlayManager';
import { RecurringDetailsSheet } from './RecurringDetailsSheet';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { Toast } from './Toast';

export interface OverlayProviderProps {
  /** Currency for the details sheet; only relevant while server data is present. */
  currency: string;
}

/** Portal host: subscribes to overlayManager and renders whatever is currently requested. */
export function OverlayProvider({ children, currency }: PropsWithChildren<OverlayProviderProps>) {
  const [state, setState] = useState<OverlayState>(overlayManager.getState());

  useEffect(() => overlayManager.subscribe(setState), []);

  return (
    <>
      {children}
      <RecurringDetailsSheet item={state.details} currency={currency} onClose={() => overlayManager.hideDetails()} />
      <ConfirmDeleteDialog
        visible={state.confirmDelete}
        onConfirm={() => overlayManager.resolveConfirmDelete(true)}
        onCancel={() => overlayManager.resolveConfirmDelete(false)}
      />
      <Toast message={state.toast} />
    </>
  );
}
