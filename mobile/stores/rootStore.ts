import { createDiagnosticsStore, type DiagnosticsStoreHook } from '@core/modules/diagnostics';
import {
  ImportController,
  createImportStore,
  type FilePicker,
  type ImportStoreHook,
} from '@core/modules/statement-import';
import { createHttpClient, type HttpClient } from '@core/shared/api/httpClient';
import { createNativeTransport } from '@core/shared/api/nativeTransport';
import type { Logger } from '@core/shared/logger';
import type { FileStager } from '@core/shared/native/statementFile';
import type { KeyValueStore } from '@core/shared/persistence/keyValueStore';

export interface RootStore {
  importController: ImportController;
  useImportStore: ImportStoreHook;
  useDiagnosticsStore: DiagnosticsStoreHook;
  /** Same client the import controller uses — diagnostics calls hit the same mock. */
  http: HttpClient;
}

export interface RootStoreDeps {
  importPersistence: KeyValueStore;
  diagnosticsPersistence: KeyValueStore;
  defaultBaseUrl: string;
  fileStager: FileStager;
  picker: FilePicker;
  logger: Logger;
  randomKey: () => string;
}

/**
 * Composition root for all module stores. The diagnostics base-url override
 * is read once here, at construction — matching the plan: it is not
 * live-reactive, so switching it takes effect on the next app start.
 */
export function createRootStore(deps: RootStoreDeps): RootStore {
  const useDiagnosticsStore = createDiagnosticsStore(deps.diagnosticsPersistence, deps.defaultBaseUrl);
  const baseUrl = useDiagnosticsStore.getState().baseUrl;
  const http = createHttpClient(createNativeTransport(deps.fileStager), baseUrl);

  const importController = new ImportController({
    persistence: deps.importPersistence,
    http,
    fileStager: deps.fileStager,
    picker: deps.picker,
    logger: deps.logger,
    randomKey: deps.randomKey,
    autoRecoverAfterUncertain: () => useDiagnosticsStore.getState().autoRecover,
  });

  return {
    importController,
    useImportStore: createImportStore(importController),
    useDiagnosticsStore,
    http,
  };
}
