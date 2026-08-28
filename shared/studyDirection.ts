export const EXPLORING_STUDY_DIRECTION = "Exploring possible study directions";
export const EXPLORING_STUDY_DIRECTION_AR = "عم استكشف مجالات الدراسة";

function normalise(value: string) {
  return value.trim().toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function isExploringStudyDirections(value: string) {
  return [EXPLORING_STUDY_DIRECTION, EXPLORING_STUDY_DIRECTION_AR].some((option) => normalise(value) === normalise(option));
}

export function isMeaningfulStudyDirection(value: string) {
  const direction = normalise(value);
  if (isExploringStudyDirections(direction)) return true;
  // Any student-written discipline is allowed. This is deliberately a basic
  // quality check, not a catalogue of approved subjects: Nanotechnology,
  // interdisciplinary paths, Arabic wording, and newly named fields all reach
  // private source-backed research rather than being rejected by the form.
  return direction.length >= 2 && /[\p{L}\p{N}]/u.test(direction);
}
