export interface PickedFile {
  uri: string;
  name: string;
}

/** Thin seam over the system document picker, so fileIntake stays testable in Node. */
export interface FilePicker {
  pick(): Promise<PickedFile | null>;
  release(uri: string): Promise<void>;
}
