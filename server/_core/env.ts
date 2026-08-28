import "dotenv/config";

const DEV_COOKIE_SECRET = "dev-only-insecure-cookie-secret-change-me-32chars!";
const DEV_CRON_SECRET = "dev-only-insecure-cron-secret-change-me";
const isProduction = process.env.NODE_ENV === "production";

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isProduction) return devFallback;
  // Refuse to run a production deployment on predictable secrets.
  throw new Error(`${name} must be set in production. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`);
}

export const ENV = {
  databaseUrl: process.env.DATABASE_URL || "",
  cookieSecret: requireSecret("COOKIE_SECRET", DEV_COOKIE_SECRET),
  sessionDurationMs: 1000 * 60 * 60 * 24 * 365,
  cronSecret: requireSecret("CRON_SECRET", DEV_CRON_SECRET),
};
