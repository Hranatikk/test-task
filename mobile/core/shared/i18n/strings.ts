// Kept as a local literal union (not imported from core/modules) so this
// shared i18n file stays decoupled from the statement-import module per the
// layering rule: core/shared cannot import core/modules.
type RejectReasonKey = 'too_large' | 'not_pdf_or_csv' | 'unreadable' | 'empty';

export const strings = {
  pickFile: 'Choose statement',
  pickFileHint: 'Opens the system file picker for a PDF or CSV statement',
  confirmTitle: 'Confirm import',
  send: 'Send',
  cancel: 'Cancel',
  sending: 'Sending…',
  checkingAgain: 'Checking…',
  uncertainTitle: "We don't know if the file reached the server",
  uncertainBody: 'The connection dropped before a response arrived. Check again, or send again with the same file.',
  checkAgain: 'Check again',
  sendAgain: 'Send again',
  notFoundYet: 'The server has not seen this import yet.',
  queued: 'Queued',
  processing: 'Processing',
  ready: 'Ready',
  refresh: 'Refresh',
  viewDetails: 'Details',
  deleteImport: 'Delete import',
  deleting: 'Deleting from the server…',
  deleteFailedTitle: 'Delete did not complete',
  deleteFailedBody: 'The server did not confirm the delete. The data may still be there.',
  retryDelete: 'Retry delete',
  deletedConfirmed: 'Import deleted from the server',
  startNew: 'Start new import',
  rejectedNotSent: 'The file was not sent.',
  chooseAnother: 'Choose another file',
  startOver: 'Start over',
  monthly: 'monthly',
  totalPerMonth: 'Total per month',
} as const;

export const rejectReasonText: Record<RejectReasonKey, string> = {
  too_large: 'This file is larger than 10 MiB and was not sent.',
  not_pdf_or_csv: 'This file is not a PDF or CSV statement and was not sent.',
  unreadable: 'The file could not be read and was not sent.',
  empty: 'The file is empty and was not sent.',
};

export function errorCodeText(code: string | undefined): string {
  switch (code) {
    case '409':
      return 'This operation was already used for a different file.';
    case '413':
    case '415':
      return 'The server rejected this file.';
    case '400':
      return 'The request was invalid.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
