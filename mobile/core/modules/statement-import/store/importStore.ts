import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { ImportController } from '../service/importController';
import type { OpState } from '../model/types';

export interface ImportStoreState {
  state: OpState;
  pickFile: () => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
  retryPost: () => Promise<void>;
  recheck: () => Promise<void>;
  refresh: () => Promise<void>;
  delete: () => Promise<void>;
  retryDelete: () => Promise<void>;
  resetLocal: () => Promise<void>;
}

export type ImportStoreHook = UseBoundStore<StoreApi<ImportStoreState>>;

/**
 * Thin zustand mirror of the controller: no persist-middleware here, the
 * controller already writes to storage inside commit() before notifying.
 */
export function createImportStore(controller: ImportController): ImportStoreHook {
  const useStore = create<ImportStoreState>(set => {
    controller.subscribe(state => set({ state }));
    return {
      state: controller.getState(),
      pickFile: () => controller.pickFile(),
      confirm: () => controller.confirm(),
      cancel: () => controller.cancel(),
      retryPost: () => controller.retryPost(),
      recheck: () => controller.recheck(),
      refresh: () => controller.refresh(),
      delete: () => controller.delete(),
      retryDelete: () => controller.retryDelete(),
      resetLocal: () => controller.resetLocal(),
    };
  });
  return useStore;
}
