export type GoogleSignInConfig = { clientId: string; clientSecret: string };

/**
 * Account sign-in may reuse Nightfall's Google OAuth client while the product
 * is in testing. Dedicated GOOGLE_* values take precedence, so Gmail’s
 * student-owned send/sync integration stays independently configurable.
 */
export function getGoogleSignInConfig(env: Record<string, string | undefined> = process.env): GoogleSignInConfig {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() || env.GMAIL_CLIENT_ID?.trim() || "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() || env.GMAIL_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) throw new Error("Google sign-in is not configured.");
  return { clientId, clientSecret };
}

export function isGoogleSignInConfigured(env: Record<string, string | undefined> = process.env) {
  try {
    getGoogleSignInConfig(env);
    return true;
  } catch {
    return false;
  }
}
