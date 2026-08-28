export const documentRequirementKeys = [
  "teaching-language",
  "admission-route",
  "admission-period",
  "qualification-route",
] as const;

export type DocumentRequirementKey = (typeof documentRequirementKeys)[number];

export function documentRequirementLabel(key: DocumentRequirementKey, language: "en" | "ar") {
  const labels = {
    en: {
      "teaching-language": "Teaching language",
      "admission-route": "Admission route",
      "admission-period": "Admission period",
      "qualification-route": "Qualification route",
    },
    ar: {
      "teaching-language": "لغة التدريس",
      "admission-route": "طريقة القبول",
      "admission-period": "فترة القبول",
      "qualification-route": "المؤهل الدراسي",
    },
  } as const;
  return labels[language][key];
}
