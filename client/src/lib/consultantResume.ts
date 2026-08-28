export function shouldResumePendingConsultantInterview(isAuthenticated: boolean, hasPendingInterview: boolean) {
  return isAuthenticated && hasPendingInterview;
}

export function shouldRedirectCompletedProfile(onboardingComplete: boolean, hasPendingInterview: boolean) {
  // A visit to the Consultant is a deliberate request for a conversation.
  // Returning students reach their journey from navigation, not by being
  // redirected away from this entry point.
  void onboardingComplete;
  void hasPendingInterview;
  return false;
}
