# Germany public discovery directory — integration audit

## Supplied dataset shape

The workbook contains a public-institution directory with **250 unique institutions**, a programme search index with **2,663 programme rows**, and a candidate sheet with **106 rows**. The programme index supplies source-aware fields for institution, city, region, programme name, broad category, official evidence URLs, official programme URLs, language, admission semester and mode, source layer, programme identifier, operational reputation tier, named cybersecurity infrastructure note, fee-risk category, Syrian baccalaureate note, and verification date.

The associated quality-control file reports no issues, no private entries, no missing programme-index evidence, and no missing public sources. It also distinguishes stronger DAAD-catalogue-linked evidence from institution records that still need manual directory verification. Those statuses should remain visible in Nightfall rather than being flattened into a quality score.

## Verified source boundaries

The official TU9 page confirms it is the alliance source for a TU9 attribute, but the product must present **TU9 as alliance membership, not a universal ranking**. [TU9 Alliance](https://www.tu9.de/en/)

The official DAAD catalogue exposes university-level programme listings, including degree, location, study mode, and deadline context. It is suitable as a discovery evidence link, not as a substitute for a university's live admissions page. [DAAD degree-programme catalogue](https://www.daad.de/en/studying-in-germany/universities/all-degree-programmes/)

The supplied Syrian secondary-school note is a discovery aid only. The product must preserve its explicit warning to confirm current Anabin, uni-assist, ZAB, and institution-specific requirements before treating any pathway as applicable.

## Recommended product boundary

Create a separate **Germany programme research index** rather than replacing the current hand-curated university catalogue. Expose official evidence and programme URLs, evidence status, language, admission mode, fee-risk category, and bounded security-research notes. Do not present the reputation tier as a score or infer eligibility or acceptance likelihood from any field.
