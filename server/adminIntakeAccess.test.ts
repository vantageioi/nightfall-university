import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 9901, openId: `intake-${role}`, email: `${role}@example.com`, name: role, loginMethod: "password", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin intake access", () => {
  it("does not expose source uploads to a student account", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.adminIntake.uploads()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
