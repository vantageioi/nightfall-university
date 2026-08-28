export const betaAccess = {
  status: "open" as const,
  current: [
    "University discovery, comparison, source links, and saved programme pages are open in beta.",
    "Official-page watches are open for the programmes a student explicitly chooses to monitor.",
    "Transcript review and deadline planning remain student-controlled and review-first.",
  ],
  later: [
    "Broader AI research across large university lists will remain an opt-in automation, not a silent recurring search.",
    "Any future outbound portal or email automation will require a separate student approval at the moment it acts.",
    "Nightfall does not charge, lock, or make admissions decisions during this beta period.",
  ],
} as const;
