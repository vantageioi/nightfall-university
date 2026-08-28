// Nightfall discovery utilities: source-backed example comparison evidence and deterministic filtering.
export type DiscoveryUniversity = {
  university: string;
  location: string;
  country: string;
  field: string;
  degree: string;
  program: string;
  deadline: string;
  tuition: string;
  scholarshipInfo: string;
  admissionRequirements: string;
  eligibilityCriteria: string;
  sourceUrl: string;
  scholarshipSourceUrl: string;
  snapshotSummary: string;
  imageUrl: string;
  imageAttribution: string;
};

export const discoveryCatalog: DiscoveryUniversity[] = [
  {
    university: "University of Amsterdam", location: "Amsterdam, Netherlands", country: "Netherlands", field: "Computing", degree: "Master's", program: "Human-Computer Interaction (Information Studies)", deadline: "2027-01-31",
    tuition: "2026–27: €2,694 statutory; €34,300 Faculty of Science non-EEA institutional fee (one-year master's).",
    scholarshipInfo: "Amsterdam Merit Scholarship (AMS) for outstanding non-EU/EEA master's applicants; faculty deadlines and criteria apply.",
    admissionRequirements: "International applicants follow the applicable admissions route and submit the required degree/application materials.",
    eligibilityCriteria: "EU/EEA deadline shown as 30 April; non-EU/EEA as 31 January. Confirm your programme-specific eligibility before applying.",
    sourceUrl: "https://www.uva.nl/en/programmes/masters/information-studies-human-computer-interaction/application-and-admission/application-and-admission.html",
    scholarshipSourceUrl: "https://www.uva.nl/en/education/fees-and-funding/masters-scholarships-and-loans/amsterdam-merit-scholarship/amsterdam-merit-scholarship.html",
    snapshotSummary: "A one-year HCI master inside Information Studies, with distinct EU/EEA and non-EU/EEA application windows shown on the official admissions page.",
    imageUrl: "/files/uva-campus_5e4e2add.jpg",
    imageAttribution: "Editorial campus image · University of Amsterdam",
  },
  {
    university: "TU Berlin", location: "Berlin, Germany", country: "Germany", field: "Computing", degree: "Master's", program: "Computer Science (Informatik)", deadline: "2027-01-20",
    tuition: "No tuition fee for this standard programme; a semester fee applies and changes by term.",
    scholarshipInfo: "Funding routes include DAAD, STIBET equal-opportunity support, and Deutschlandstipendium.",
    admissionRequirements: "First degree in computer science/related field; 36 CS-foundation credits, 18 mathematics credits, and 30 additional CS credits.",
    eligibilityCriteria: "Open admission; English CEFR B2 evidence required. Check the regulations for accepted proof and credit mapping.",
    sourceUrl: "https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/computer-science-informatik-m-sc",
    scholarshipSourceUrl: "https://www.tu.berlin/en/international/students-1/international-students/international-degree-seeking-students/scholarships-and-other-funding-for-international-students",
    snapshotSummary: "An English-taught, open-admission Computer Science master with a published subject-credit map and multiple specialization paths.",
    imageUrl: "/files/tu-berlin-campus_246924c2.jpg",
    imageAttribution: "Editorial campus image · TU Berlin",
  },
  {
    university: "University of Bologna", location: "Bologna, Italy", country: "Italy", field: "Humanities", degree: "Master's", program: "Digital Humanities and Digital Knowledge", deadline: "2027-02-02",
    tuition: "2026–27: €157.04 first instalment plus a programme- and income-based contribution; reductions/exemptions may apply.",
    scholarshipInfo: "ER.GO regional scholarship: applications can include scholarship support, accommodation, and catering contributions.",
    admissionRequirements: "Relevant first-cycle degree; at least 24 ECTS in listed fields, including 6 ECTS in computer science/data processing; admission interview.",
    eligibilityCriteria: "English CEFR B2 is required. Foreign qualifications are assessed for correspondence; students must meet all curricular requirements.",
    sourceUrl: "https://corsi.unibo.it/2cycle/DigitalHumanitiesKnowledge/how-to-enrol",
    scholarshipSourceUrl: "https://www.er-go.it/",
    snapshotSummary: "A Digital Humanities master that combines humanities and computing foundations, with published ECTS, language, interview, and documentation requirements.",
    imageUrl: "/files/unibo-campus_95e4a0d7.jpeg",
    imageAttribution: "Editorial campus image · University of Bologna",
  },
  {
    university: "University of Toronto", location: "Toronto, Canada", country: "Canada", field: "Social science", degree: "Master's", program: "Master of Public Policy (MPP)", deadline: "2027-01-28",
    tuition: "2026–27 tuition: C$18,030 domestic or C$52,960 international, before listed incidentals and UHIP.",
    scholarshipInfo: "Merit entrance awards; Paul Cadario Fellowship (est. C$7,200); Ontario Graduate Scholarship route for eligible applicants.",
    admissionRequirements: "Four-year bachelor's/equivalent; minimum cumulative B and final-year B+ (3.3/4.0); statement, two references, and Kira prompts.",
    eligibilityCriteria: "International degree equivalency review; English proof when required; GRE required for qualifying degrees completed outside Canada.",
    sourceUrl: "https://munkschool.utoronto.ca/mpp/admissions",
    scholarshipSourceUrl: "https://munkschool.utoronto.ca/mpp/fees-and-financial-aid",
    snapshotSummary: "A two-year professional public-policy master with a holistic review, published academic thresholds, references, and a structured Kira assessment.",
    imageUrl: "/files/utoronto-campus_16c9c86e.jpg",
    imageAttribution: "Editorial campus image · University of Toronto",
  },
];

export function filterUniversityCatalog(catalog: DiscoveryUniversity[], search: string, region: string, field: string) {
  const term = search.trim().toLowerCase();
  return catalog.filter((item) =>
    (!term || `${item.university} ${item.program}`.toLowerCase().includes(term)) &&
    (region === "All" || item.country === region) &&
    (field === "All" || item.field === field),
  );
}

export function deadlineForSavedUniversity(university: string, deadline: string | null) {
  const parsed = new Date(deadline ?? "");
  return Number.isNaN(parsed.getTime()) ? null : { university, date: parsed };
}
