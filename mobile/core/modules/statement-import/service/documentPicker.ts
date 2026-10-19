import { errorCodes, isErrorWithCode, pick, releaseSecureAccess, types } from '@react-native-documents/picker';
import type { FilePicker, PickedFile } from './filePicker';

/**
 * 'open' mode grants a security-scoped URL without an OS-level copy — our own
 * stage() makes the one copy we control. Access lasts until release() or app
 * termination, never persisted beyond that.
 */
export const documentFilePicker: FilePicker = {
  async pick(): Promise<PickedFile | null> {
    try {
      // types.csv is an array of MIME types on Android but a single UTI string on
      // iOS — spreading it unconditionally shreds the iOS string into characters
      // and crashes the native picker, so normalize to an array first.
      const csvTypes = Array.isArray(types.csv) ? types.csv : [types.csv];
      const [file] = await pick({
        type: [types.pdf, ...csvTypes, types.plainText],
        mode: 'open',
      });
      return { uri: file.uri, name: file.name ?? 'statement' };
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
      throw error;
    }
  },

  async release(uri: string): Promise<void> {
    await releaseSecureAccess([uri]).catch(() => {});
  },
};
