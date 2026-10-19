import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface StageResult {
  path: string;
  size: number;
  head: Array<number>;
}

export interface UploadResult {
  status: number;
  body: string;
}

export interface Spec extends TurboModule {
  stage(sourceUri: string, opId: string, maxBytes: number): Promise<StageResult>;
  upload(url: string, path: string, headers: Object, timeoutMs: number): Promise<UploadResult>;
  remove(path: string): Promise<void>;
  sweep(keepPaths: Array<string>): Promise<number>;
  randomKey(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StatementFile');
