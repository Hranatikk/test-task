import { useShallow } from 'zustand/react/shallow';
import type { ImportStoreHook, ImportStoreState } from '../store/importStore';

export type ImportActions = Omit<ImportStoreState, 'state'>;

const ACTION_KEYS = [
  'pickFile',
  'confirm',
  'cancel',
  'retryPost',
  'recheck',
  'refresh',
  'delete',
  'retryDelete',
  'resetLocal',
] as const;

export function createUseImportActions(useStore: ImportStoreHook): () => ImportActions {
  return () =>
    useStore(
      useShallow(s => {
        const actions = {} as ImportActions;
        for (const key of ACTION_KEYS) actions[key] = s[key];
        return actions;
      }),
    );
}
