import type { ImportStoreHook } from '../store/importStore';
import type { OpState } from '../model/types';

export function createUseImportState(useStore: ImportStoreHook): () => OpState {
  return () => useStore(s => s.state);
}
