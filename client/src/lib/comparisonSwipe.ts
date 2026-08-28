export function comparisonSwipeDelta(offsetX: number, isArabic: boolean, threshold = 48) {
  const readingDirectionOffset = isArabic ? -offsetX : offsetX;
  if (readingDirectionOffset <= -threshold) return 1;
  if (readingDirectionOffset >= threshold) return -1;
  return 0;
}

export function nextComparisonIndex(currentIndex: number, comparisonCount: number, delta: number) {
  if (comparisonCount <= 0) return 0;
  return (currentIndex + delta + comparisonCount) % comparisonCount;
}
