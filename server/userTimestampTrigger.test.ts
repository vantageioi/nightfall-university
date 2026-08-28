import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("users updated-at trigger migration", () => {
  it("uses the users table’s real quoted timestamp column", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/0006_fix_users_updated_at_trigger.sql"), "utf8");
    const executableSql = migration.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
    expect(migration).toContain('DROP TRIGGER IF EXISTS trg_users_updated_at ON "users";');
    expect(migration).toContain('NEW."updatedAt" = NOW();');
    expect(migration).toContain('BEFORE UPDATE ON "users"');
    expect(executableSql).not.toContain("NEW.updated_at");
  });
});
