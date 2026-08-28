export const MIN_GRADUATION_YEAR = 2019;
export const MAX_GRADUATION_YEAR = 2038;

export function moveGraduationYearAtDigit(year: string, digitIndex: number, direction: 1 | -1): string {
  const normalized = Number(year);
  const current = Number.isInteger(normalized) && normalized >= MIN_GRADUATION_YEAR && normalized <= MAX_GRADUATION_YEAR ? normalized : 2027;
  const placeValue = 10 ** (3 - digitIndex);
  const next = current + direction * placeValue;
  if (next > MAX_GRADUATION_YEAR) return String(MIN_GRADUATION_YEAR);
  if (next < MIN_GRADUATION_YEAR) return String(MAX_GRADUATION_YEAR);
  return String(next);
}
