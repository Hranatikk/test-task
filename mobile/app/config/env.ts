/** Android emulator loopback alias; adb reverse maps the same port for a physical device over USB. */
export const DEFAULT_API_BASE_URL = __DEV__ ? 'http://localhost:8787' : 'http://127.0.0.1:8787';

export const ENABLE_DIAGNOSTICS = __DEV__;
