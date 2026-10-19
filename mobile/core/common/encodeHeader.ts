export function encodeHeaderValue(value: string, maxLength = 255): string {
  return encodeURIComponent(value).slice(0, maxLength);
}
