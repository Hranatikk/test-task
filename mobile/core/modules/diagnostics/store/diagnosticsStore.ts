import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { HttpClient } from '@core/shared/api/httpClient';
import type { KeyValueStore } from '@core/shared/persistence/keyValueStore';
import { getTestState, resetTestState, setScenario, type ScenarioMode, type TestState } from '../api/testControlApi';

const BASE_URL_KEY = 'diagnostics:baseUrl:v1';
const AUTO_RECOVER_KEY = 'diagnostics:autoRecover:v1';

export interface DiagnosticsStoreState {
  baseUrl: string;
  autoRecover: boolean;
  lastState: TestState | null;
  setBaseUrl: (url: string) => void;
  setAutoRecover: (value: boolean) => void;
  setScenario: (http: HttpClient, mode: ScenarioMode) => Promise<void>;
  refreshState: (http: HttpClient) => Promise<void>;
  reset: (http: HttpClient) => Promise<void>;
}

export type DiagnosticsStoreHook = UseBoundStore<StoreApi<DiagnosticsStoreState>>;

export function createDiagnosticsStore(persistence: KeyValueStore, defaultBaseUrl: string): DiagnosticsStoreHook {
  const storedBaseUrl = persistence.getString(BASE_URL_KEY) ?? defaultBaseUrl;
  const storedAutoRecover = persistence.getString(AUTO_RECOVER_KEY) !== 'false';

  return create<DiagnosticsStoreState>((set, get) => ({
    baseUrl: storedBaseUrl,
    autoRecover: storedAutoRecover,
    lastState: null,
    setBaseUrl: url => {
      persistence.set(BASE_URL_KEY, url);
      set({ baseUrl: url });
    },
    setAutoRecover: value => {
      persistence.set(AUTO_RECOVER_KEY, String(value));
      set({ autoRecover: value });
    },
    setScenario: async (http, mode) => {
      await setScenario(http, mode);
      await get().refreshState(http);
    },
    refreshState: async http => {
      const lastState = await getTestState(http);
      set({ lastState });
    },
    reset: async http => {
      await resetTestState(http);
      await get().refreshState(http);
    },
  }));
}
