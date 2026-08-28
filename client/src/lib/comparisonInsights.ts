type ComparisonEvidence = {
  tuition: string | null;
  scholarshipInfo: string | null;
  admissionRequirements: string | null;
  eligibilityCriteria: string | null;
};

export function keyDifferenceFromEvidence(item: ComparisonEvidence) {
  const scholarship = item.scholarshipInfo?.trim();
  const tuition = item.tuition?.trim();
  const admission = item.admissionRequirements?.trim();
  const eligibility = item.eligibilityCriteria?.trim();
  const namedFunding = scholarship?.match(/(Amsterdam Merit Scholarship|ER\.GO|DAAD|Deutschlandstipendium|STIBET)/i)?.[0];

  if (namedFunding) return `Named funding route: ${namedFunding}`;
  if (tuition && /no tuition fee/i.test(tuition)) return "No tuition fee; a semester contribution still applies";
  if (eligibility && /open admission/i.test(eligibility)) return "Open-admission route with published eligibility evidence";
  if (admission) return `Requirements focus: ${admission.split(/[.;]/)[0]}`;
  if (tuition) return `Cost context: ${tuition.split(/[.;]/)[0]}`;
  return "Open the source to review this programme’s current details";
}

export function programmeLanguageAlert(item: Pick<ComparisonEvidence, "admissionRequirements" | "eligibilityCriteria">) {
  const evidence = `${item.admissionRequirements ?? ""} ${item.eligibilityCriteria ?? ""}`;
  if (/english/i.test(evidence)) return "English-language evidence is referenced—confirm the live teaching-language requirement.";
  if (/german/i.test(evidence)) return "German-language evidence is referenced—confirm the live teaching-language requirement.";
  return "Teaching language is not in this saved snapshot—confirm it on the official programme page.";
}

export function programmeDeadlineAlert(deadline: string | null) {
  if (deadline?.trim()) return `Recorded deadline context: ${deadline}. Confirm the current official deadline before relying on it.`;
  return "No deadline is stored in this snapshot—check the official programme page before planning.";
}
