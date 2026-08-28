import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("Vercel-safe application boundary", () => {
  it("creates an Express app with API, private-file, and external-cron routes without binding a port", () => {
    const app = createApp();
    const routes = (app as unknown as { _router: { stack: Array<{ route?: { path?: string } }> } })._router.stack
      .flatMap((layer) => layer.route?.path ? [layer.route.path] : []);

    expect(routes).toContain("/files/*");
    expect(routes).toContain("/api/cron/deadline-nudges");
    expect(routes).toContain("/api/cron/source-watches");
    expect(routes).toContain("/api/health");
    expect(routes).toContain("/api/auth/login");
    expect(routes).toContain("/api/auth/google");
    expect(routes).toContain("/api/auth/google/callback");
  });
});
