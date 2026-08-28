export function visibleGermanyResearchResults<T>(records: T[], showAll: boolean, initialCount = 6) {
  return showAll ? records : records.slice(0, initialCount);
}

export function remainingGermanyResearchResultCount(total: number, initialCount = 6) {
  return Math.max(0, total - initialCount);
}
