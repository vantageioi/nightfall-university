import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import { registerGmailRoutes } from "./gmailRoutes";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { authenticateRequest, createSessionToken, loginUser, registerUser } from "./_core/auth";
import { requestEmailCode, verifyEmailCode } from "./emailVerification";
import { findOrCreateGoogleUser, getDb } from "./db";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";
import { storageGetSignedUrl } from "./storage";
import { registerCronRoutes } from "./cronRoutes";
import { isGmailConfigured } from "./gmailConnection";
import { getGoogleSignInConfig, isGoogleSignInConfigured } from "./googleSignIn";

function setSessionCookie(res: express.Response, token: string) {
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(), maxAge: ENV.sessionDurationMs });
}

function publicRequestOrigin(req: express.Request) {
  const protocol = req.header("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

/**
 * Builds Nightfall's HTTP surface without binding a port. The exported app is
 * reusable by local development, production Node startup, and Vercel functions.
 */
export function createApp() {
  const app = express();
  // Vercel terminates TLS before invoking the function. Trusting one proxy hop
  // keeps OAuth callback URLs and secure cookies correct without trusting a
  // caller-supplied chain beyond the platform edge.
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again in 15 minutes." },
  });
  app.post("/api/auth/login", authLimiter);
  app.post("/api/auth/register", authLimiter);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database is not configured");
      await db.execute(sql`select 1`);
      return res.json({ status: "ok", database: "connected", googleSignIn: isGoogleSignInConfigured() ? "configured" : "not-configured", gmail: isGmailConfigured() ? "configured" : "not-configured", documentStorage: process.env.S3_BUCKET ? "configured" : "not-configured" });
    } catch (error) {
      console.error("[Health] Database probe failed:", error);
      return res.status(503).json({ status: "unavailable", database: "unavailable", googleSignIn: isGoogleSignInConfigured() ? "configured" : "not-configured", gmail: isGmailConfigured() ? "configured" : "not-configured", documentStorage: process.env.S3_BUCKET ? "configured" : "not-configured" });
    }
  });
  registerStorageProxy(app);
  registerGmailRoutes(app);

  // Private student/admin uploads never become public URLs. After the usual
  // self-hosted session check and subtree authorization, redirect to a short
  // S3 signed URL rather than reading from an ephemeral function filesystem.
  app.get("/files/*", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const key = decodeURIComponent(req.path.replace(/^\/files\//, "")).replace(/\.\./g, "_");
      if (key.startsWith("students/")) {
        const ownerId = Number(key.split("/")[1]);
        if (user.role !== "admin" && ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      } else if (key.startsWith("admin-intake/")) {
        if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
      } else {
        return res.status(404).json({ error: "Not found" });
      }
      return res.redirect(307, await storageGetSignedUrl(key));
    } catch (error) {
      console.error("[Storage] Private file redirect failed:", error);
      return res.status(401).json({ error: "Sign in to access your documents." });
    }
  });

  app.post("/api/auth/request-code", authLimiter, async (req, res) => {
    try {
      const result = await requestEmailCode(req.body?.email ?? "");
      return res.json({ success: true, expiresAt: result.expiresAt.toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send the verification code.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/verify-code", authLimiter, async (req, res) => {
    try {
      const result = await verifyEmailCode(req.body?.email ?? "", req.body?.code ?? "");
      return res.json({ success: true, unlockToken: result.unlockToken });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const user = await registerUser({ email: req.body?.email ?? "", name: req.body?.name ?? "", password: req.body?.password ?? "", unlockToken: req.body?.unlockToken ?? "" });
      if (!user) throw new Error("Could not create the account.");
      setSessionCookie(res, await createSessionToken(user));
      return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const user = await loginUser({ email: req.body?.email ?? "", password: req.body?.password ?? "", unlockToken: req.body?.unlockToken ?? "" });
      setSessionCookie(res, await createSessionToken(user));
      return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      return res.status(401).json({ error: message });
    }
  });

  app.get("/api/auth/google", async (req, res) => {
    let clientId = "";
    try { ({ clientId } = getGoogleSignInConfig()); } catch { return res.status(500).send("Google sign-in is not configured."); }
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookie("google_auth_nonce", nonce, { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 10 * 60 * 1000 });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", `${publicRequestOrigin(req)}/api/auth/google/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", nonce);
    return res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { clientId, clientSecret } = getGoogleSignInConfig();
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const expectedNonce = (req.headers.cookie ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("google_auth_nonce="))?.slice("google_auth_nonce=".length);
      res.clearCookie("google_auth_nonce", { path: "/" });
      if (!code || !state || !expectedNonce || state !== expectedNonce) return res.status(403).send("Invalid Google sign-in attempt.");
      const redirectUri = `${publicRequestOrigin(req)}/api/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
      if (!tokenResponse.ok) return res.status(403).send("Google sign-in failed.");
      const tokens = (await tokenResponse.json()) as { id_token?: string };
      if (!tokens.id_token) return res.status(403).send("Google sign-in failed.");
      const claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()) as { sub?: string; email?: string; name?: string };
      if (!claims.sub || !claims.email) return res.status(403).send("Google account did not share an email.");
      const user = await findOrCreateGoogleUser({ googleId: claims.sub, email: claims.email, name: claims.name ?? null });
      if (!user) throw new Error("user unavailable");
      setSessionCookie(res, await createSessionToken(user));
      return res.redirect("/dashboard");
    } catch (error) {
      console.error("[Auth] Google sign-in failed:", error);
      return res.status(403).send("Google sign-in failed.");
    }
  });

  registerCronRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
