import { createMMKV } from 'react-native-mmkv';
import type { KeyValueStore } from './keyValueStore';

export function createMmkvStore(id = 'statement-import'): KeyValueStore {
  const storage = createMMKV({ id });
  return {
    getString: key => storage.getString(key),
    set: (key, value) => storage.set(key, value),
    delete: key => {
      storage.remove(key);
    },
  };
}
