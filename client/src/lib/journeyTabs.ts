export const journeyTabs = ["consult", "discover", "essays", "compare", "reach", "calendar", "watch", "documents"] as const;

export type JourneyTab = typeof journeyTabs[number];

export function journeyTabFromSearch(search: string): JourneyTab {
  const tab = new URLSearchParams(search).get("tab");
  return journeyTabs.includes(tab as JourneyTab) ? tab as JourneyTab : "discover";
}

export function journeySearchForTab(search: string, tab: JourneyTab) {
  const params = new URLSearchParams(search);
  if (tab === "discover") params.delete("tab");
  else params.set("tab", tab);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function comparisonSelectionFromSearch(search: string, availableIds: number[]) {
  const comparison = new URLSearchParams(search).get("compare");
  if (comparison === "all") return availableIds.slice(0, 3);
  return (comparison ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && availableIds.includes(id)).slice(0, 3);
}
