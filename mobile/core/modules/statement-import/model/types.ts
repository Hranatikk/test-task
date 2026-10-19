export type ServerStatus = 'queued' | 'processing' | 'ready' | 'deleting' | 'deleted';

export interface RecurringItem {
  id: string;
  merchant: string;
  amountMinor: number;
  cadence: string;
  lastSeen: string;
}

export interface JobView {
  jobId: string;
  status: ServerStatus;
  revision: number;
  currency?: string;
  items?: RecurringItem[];
}

export type Phase =
  | 'idle'
  | 'staged' // копия создана и провалидирована, ждём подтверждения
  | 'rejected' // локально отклонён, POST не было
  | 'prepared' // ключ сохранён, POST ещё не начат
  | 'posting'
  | 'uncertain' // POST без ответа, исход неизвестен
  | 'tracking' // jobId известен, следим за статусом
  | 'failed'; // 409/415/прочее — нужна новая операция

export type DeletePhase = 'none' | 'requested' | 'failed' | 'accepted' | 'confirmed';

export type RejectReason = 'too_large' | 'not_pdf_or_csv' | 'unreadable' | 'empty';

export type FileFormat = 'pdf' | 'csv';

export interface OpState {
  opId: string;
  phase: Phase;
  stagedPath?: string; // <opId>.bin, без имени файла
  displayName?: string; // только в памяти/на экране подтверждения, см. 4.3
  size?: number;
  format?: FileFormat;
  idempotencyKey?: string;
  jobId?: string;
  server?: JobView; // последнее ПРИНЯТОЕ состояние
  deleteKey?: string;
  deletePhase: DeletePhase;
  rejectReason?: RejectReason;
  errorCode?: string;
}

export type ImportEvent =
  | { type: 'STAGED'; path: string; size: number; format: FileFormat; displayName: string }
  | { type: 'REJECTED'; reason: RejectReason }
  | { type: 'CONFIRMED'; key: string }
  | { type: 'POST_STARTED' }
  | { type: 'POST_ACCEPTED'; view: JobView }
  | { type: 'POST_UNCERTAIN' }
  | { type: 'BY_KEY_FOUND'; view: JobView }
  | { type: 'BY_KEY_NOT_FOUND' }
  | { type: 'POST_FAILED'; code: string }
  | { type: 'STATUS'; view: JobView }
  | { type: 'DELETE_REQUESTED'; deleteKey: string }
  | { type: 'DELETE_ACCEPTED'; view: JobView }
  | { type: 'DELETE_FAILED'; code: string }
  | { type: 'RESET' };

export function createIdleState(opId: string): OpState {
  return { opId, phase: 'idle', deletePhase: 'none' };
}
