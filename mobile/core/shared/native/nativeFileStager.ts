import NativeStatementFile from './specs/NativeStatementFile';
import type { FileStager } from './statementFile';

export const nativeFileStager: FileStager = {
  stage: (sourceUri, opId, maxBytes) => NativeStatementFile.stage(sourceUri, opId, maxBytes),
  upload: (url, path, headers, timeoutMs) => NativeStatementFile.upload(url, path, headers, timeoutMs),
  remove: path => NativeStatementFile.remove(path),
  sweep: keepPaths => NativeStatementFile.sweep(keepPaths),
  randomKey: () => NativeStatementFile.randomKey(),
};
