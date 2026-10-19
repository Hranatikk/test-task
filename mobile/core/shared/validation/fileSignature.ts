import { MAX_BYTES } from '@core/common/constants';

export function sniff(head: number[]): 'pdf' | 'csv' | null {
  const s = String.fromCharCode(...head.slice(0, 24));
  if (s.startsWith('%PDF-')) return 'pdf';
  if (s.replace(/\r/g, '').startsWith('date,description,amount\n')) return 'csv';
  return null;
}

export function validateStaged(size: number, head: number[]) {
  if (size === 0) return { ok: false as const, reason: 'empty' as const };
  if (size > MAX_BYTES) return { ok: false as const, reason: 'too_large' as const };
  const format = sniff(head);
  return format
    ? { ok: true as const, format }
    : { ok: false as const, reason: 'not_pdf_or_csv' as const };
}
