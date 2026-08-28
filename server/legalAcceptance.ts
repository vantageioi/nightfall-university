export const PENDING_PROFILE_VALUE = "Not specified yet";

/**
 * A user may reach the legal gate immediately after Google creates their
 * account, before the private Consultation creates their student profile.
 * The legal record needs a real profile row, but these explicit placeholders
 * preserve the fact that no study destination or graduation year was supplied.
 */
export function legalAcceptanceProfile(userId: number, version: string) {
  return {
    userId,
    destination: PENDING_PROFILE_VALUE,
    graduationYear: PENDING_PROFILE_VALUE,
    acceptedLegalVersion: version.trim().slice(0, 16),
    onboardingComplete: false,
  };
}
