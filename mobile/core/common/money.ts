export function formatMinor(amountMinor: number, currency: string, locale = 'en-AU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / 100);
}
