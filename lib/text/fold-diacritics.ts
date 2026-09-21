/** Fold Slovak/Latin diacritics for search (Národné → narodne). */
export function foldDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}
