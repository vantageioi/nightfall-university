import type { Request } from "express";

// SameSite=Lax: the app is first-party only. Lax blocks the CSRF class
// outright. (The old "none" value existed for Manus's cross-site preview
// iframes — that constraint is gone.)
export function getSessionCookieOptions(_req?: Request) {
  void _req;
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };
}
