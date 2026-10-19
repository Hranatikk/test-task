import type { KeyValueStore } from './keyValueStore';

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getString: key => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    delete: key => {
      map.delete(key);
    },
  };
}
