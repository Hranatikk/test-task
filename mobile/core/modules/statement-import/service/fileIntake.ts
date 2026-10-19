import { MAX_BYTES } from '@core/common/constants';
import type { FileStager } from '@core/shared/native/statementFile';
import { statementFileErrorCode } from '@core/shared/native/statementFile';
import { validateStaged } from '@core/shared/validation/fileSignature';
import type { FilePicker } from './filePicker';
import type { FileFormat, RejectReason } from '../model/types';

export type IntakeResult =
  | { kind: 'cancelled' }
  | { kind: 'staged'; path: string; size: number; format: FileFormat; displayName: string }
  | { kind: 'rejected'; reason: RejectReason };

export async function intake(picker: FilePicker, stager: FileStager, opId: string): Promise<IntakeResult> {
  const picked = await picker.pick();
  if (!picked) return { kind: 'cancelled' };
  try {
    const staged = await stager.stage(picked.uri, opId, MAX_BYTES);
    const validated = validateStaged(staged.size, staged.head);
    if (!validated.ok) {
      await stager.remove(staged.path).catch(() => {});
      return { kind: 'rejected', reason: validated.reason };
    }
    return {
      kind: 'staged',
      path: staged.path,
      size: staged.size,
      format: validated.format,
      displayName: picked.name,
    };
  } catch (error) {
    return { kind: 'rejected', reason: mapStageError(error) };
  } finally {
    await picker.release(picked.uri).catch(() => {});
  }
}

function mapStageError(error: unknown): RejectReason {
  const code = statementFileErrorCode(error);
  if (code === 'E_TOO_LARGE') return 'too_large';
  if (code === 'E_EMPTY') return 'empty';
  return 'unreadable';
}
