import { openSync, readSync, statSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { HEAD_BYTES, MAX_BYTES } from '@core/common/constants';
import { sniff, validateStaged } from '../fileSignature';

const FIXTURES = join(__dirname, '../../../../../kit/fixtures');

function readHead(path: string, bytes = HEAD_BYTES): { size: number; head: number[] } {
  const size = statSync(path).size;
  const buffer = Buffer.alloc(bytes);
  const fd = openSync(path, 'r');
  const read = readSync(fd, buffer, 0, bytes, 0);
  closeSync(fd);
  return { size, head: Array.from(buffer.subarray(0, read)) };
}

function headOf(text: string): number[] {
  return Array.from(Buffer.from(text, 'utf8').subarray(0, HEAD_BYTES));
}

describe('validateStaged against the shared fixtures', () => {
  it('accepts statement.csv', () => {
    const { size, head } = readHead(join(FIXTURES, 'statement.csv'));
    expect(validateStaged(size, head)).toEqual({ ok: true, format: 'csv' });
  });

  it('accepts statement.pdf', () => {
    const { size, head } = readHead(join(FIXTURES, 'statement.pdf'));
    expect(validateStaged(size, head)).toEqual({ ok: true, format: 'pdf' });
  });

  it('rejects spoofed.pdf as not a real PDF/CSV', () => {
    const { size, head } = readHead(join(FIXTURES, 'spoofed.pdf'));
    expect(validateStaged(size, head)).toEqual({ ok: false, reason: 'not_pdf_or_csv' });
  });

  it('rejects oversize.csv as too large', () => {
    const size = statSync(join(FIXTURES, 'oversize.csv')).size;
    expect(size).toBeGreaterThan(MAX_BYTES);
    const { head } = readHead(join(FIXTURES, 'oversize.csv'));
    expect(validateStaged(size, head)).toEqual({ ok: false, reason: 'too_large' });
  });
});

describe('validateStaged edge cases', () => {
  it('rejects CRLF-terminated CSV header, matching the server rule', () => {
    const head = headOf('date,description,amount\r\n2026-01-01,Coffee,500\n');
    expect(sniff(head)).toBeNull();
    expect(validateStaged(100, head)).toEqual({ ok: false, reason: 'not_pdf_or_csv' });
  });

  it('rejects CSV with a UTF-8 BOM prefix, matching the server rule', () => {
    const head = Array.from(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('date,description,amount\n')]),
    ).slice(0, HEAD_BYTES);
    expect(sniff(head)).toBeNull();
    expect(validateStaged(100, head)).toEqual({ ok: false, reason: 'not_pdf_or_csv' });
  });

  it('accepts a file exactly at the 10 MiB limit', () => {
    const head = headOf('%PDF-1.4\n');
    expect(validateStaged(MAX_BYTES, head)).toEqual({ ok: true, format: 'pdf' });
  });

  it('rejects a file one byte over the 10 MiB limit', () => {
    const head = headOf('%PDF-1.4\n');
    expect(validateStaged(MAX_BYTES + 1, head)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('rejects an empty file', () => {
    expect(validateStaged(0, [])).toEqual({ ok: false, reason: 'empty' });
  });
});
