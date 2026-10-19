import { documentFilePicker } from '@core/modules/statement-import/service/documentPicker';
import { createLogger, noopLogger } from '@core/shared/logger';
import { nativeFileStager } from '@core/shared/native/nativeFileStager';
import { createMmkvStore } from '@core/shared/persistence/mmkvStore';
import { createRootStore, type RootStore } from '@stores/rootStore';
import { DEFAULT_API_BASE_URL } from '../config/env';

/** DI composition root: wires real native/platform implementations into the module stores. */
export function createComposition(): RootStore {
  return createRootStore({
    importPersistence: createMmkvStore('statement-import'),
    diagnosticsPersistence: createMmkvStore('diagnostics'),
    defaultBaseUrl: DEFAULT_API_BASE_URL,
    fileStager: nativeFileStager,
    picker: documentFilePicker,
    logger: __DEV__
      ? createLogger((event, fields) => console.log(`[import] ${event}`, fields))
      : noopLogger,
    randomKey: () => nativeFileStager.randomKey(),
  });
}
