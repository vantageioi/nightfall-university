import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import { parse as parseCookie } from "cookie";
import { saveStudentGmailConnection } from "./db";
import { createGmailOAuthState, encryptGmailRefreshToken, getGmailOAuthConfig, getGmailScopes, validateGmailOAuthState } from "./gmailConnection";
import { authenticateRequest } from "./_core/auth";

const GMAIL_OAUTH_STATE_COOKIE = "__Host-gmail_oauth_state";
const REDIRECT_PATH = "/settings";

function callbackUrl(req: Request) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string" ? forwardedProtocol.split(",")[0] : req.protocol;
  const host = req.get("host");
  if (!host) throw new Error("Unable to determine Gmail callback host.");
  return `${protocol}://${host}/api/gmail/callback`;
}

function redirectToSettings(res: Response, status: "connected" | "unavailable" | "error") {
  res.redirect(302, `${REDIRECT_PATH}?gmail=${status}`);
}

async function authenticatedStudent(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) throw new Error("Student sign-in required.");
  return user;
}

export function registerGmailRoutes(app: Express) {
  app.get("/api/gmail/connect", async (req, res) => {
    try {
      const student = await authenticatedStudent(req);
      const config = getGmailOAuthConfig();
      const redirectUri = callbackUrl(req);
      const client = new google.auth.OAuth2(config.clientId, config.clientSecret, redirectUri);
      const state = createGmailOAuthState(student.id);
      res.cookie(GMAIL_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure: req.secure || req.headers["x-forwarded-proto"] === "https", sameSite: "lax", path: "/", maxAge: 10 * 60 * 1000 });
      const authorizeUrl = client.generateAuthUrl({ access_type: "offline", prompt: "consent", include_granted_scopes: true, scope: getGmailScopes(), state });
      res.redirect(302, authorizeUrl);
    } catch (error) {
      console.error("[Gmail] Connection start failed", error);
      redirectToSettings(res, "unavailable");
    }
  });

  app.get("/api/gmail/callback", async (req, res) => {
    try {
      const student = await authenticatedStudent(req);
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const cookieState = parseCookie(req.headers.cookie ?? "")[GMAIL_OAUTH_STATE_COOKIE];
      if (!code || !state || !cookieState || cookieState !== state || !validateGmailOAuthState(state, student.id)) throw new Error("Gmail connection could not be verified.");

      const config = getGmailOAuthConfig();
      const client = new google.auth.OAuth2(config.clientId, config.clientSecret, callbackUrl(req));
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) throw new Error("Google did not return a reusable connection. Please try connecting Gmail again.");
      client.setCredentials(tokens);
      const profile = await google.gmail({ version: "v1", auth: client }).users.getProfile({ userId: "me" });
      const emailAddress = profile.data.emailAddress;
      if (!emailAddress) throw new Error("Google did not return an inbox address.");

      await saveStudentGmailConnection(student.id, { emailAddress, encryptedRefreshToken: encryptGmailRefreshToken(tokens.refresh_token), gmailHistoryId: profile.data.historyId ?? undefined });
      res.clearCookie(GMAIL_OAUTH_STATE_COOKIE, { path: "/", secure: req.secure || req.headers["x-forwarded-proto"] === "https", sameSite: "lax" });
      redirectToSettings(res, "connected");
    } catch (error) {
      console.error("[Gmail] Connection callback failed", error);
      res.clearCookie(GMAIL_OAUTH_STATE_COOKIE, { path: "/" });
      redirectToSettings(res, "error");
    }
  });
}
