import { createContext, useContext } from 'react';
import type { RootStore } from '@stores/rootStore';

export const RootStoreContext = createContext<RootStore | null>(null);

export function useRootStore(): RootStore {
  const store = useContext(RootStoreContext);
  if (!store) throw new Error('RootStoreContext is not provided — mount AppRoot at the app root');
  return store;
}
