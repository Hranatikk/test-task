import type { FilePicker, PickedFile } from '@core/modules/statement-import';

export function createFakePicker(file: PickedFile | null): FilePicker {
  return {
    async pick() {
      return file;
    },
    async release() {},
  };
}
