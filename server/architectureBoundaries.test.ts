import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SERVER_DIR = join(__dirname);
const CLIENT_SRC = join(__dirname, "..", "client", "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function importStatements(filePath: string): Array<{ spec: string; statement: string }> {
  const content = readFileSync(filePath, "utf8");
  const out: Array<{ spec: string; statement: string }> = [];
  const re = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    out.push({ spec: m[1] || m[2] || m[3], statement: m[0].trim() });
  }
  return out;
}

function isTypeOnlyImport(statement: string): boolean {
  return /^import\s+type\b/.test(statement);
}

describe("architecture boundaries (docs/architecture.md §3)", () => {
  it("server/domain must consume the LLM via integrations/llm, never _core/llm", () => {
    const domainFiles = walk(join(SERVER_DIR, "domain"));
    expect(domainFiles.length).toBeGreaterThan(0);
    const violations = domainFiles.flatMap((f) =>
      importStatements(f)
        .filter((i) => i.spec.includes("_core/llm"))
        .map((i) => `${f}: ${i.spec}`)
    );
    expect(violations).toEqual([]);
  });

  it("server/domain must import only the public integrations/llm entry, never adapter internals", () => {
    const domainFiles = walk(join(SERVER_DIR, "domain"));
    const violations = domainFiles.flatMap((f) =>
      importStatements(f)
        .filter((i) => /integrations\/llm\/(gemini|types)/.test(i.spec))
        .map((i) => `${f}: ${i.spec}`)
    );
    expect(violations).toEqual([]);
  });

  it("client must never RUNTIME-import server code; only type-only AppRouter imports are permitted (tRPC boundary)", () => {
    const clientFiles = walk(CLIENT_SRC);
    expect(clientFiles.length).toBeGreaterThan(0);
    const violations = clientFiles.flatMap((f) =>
      importStatements(f)
        .filter((i) => i.spec.startsWith("."))
        .filter((i) => /(^|\/)server(\/|$)/.test(i.spec))
        .filter((i) => !isTypeOnlyImport(i.statement))
        .map((i) => `${f}: ${i.spec}`)
    );
    expect(violations).toEqual([]);
  });

  it("server/domain must not import gmailConnection or integrations/email internals", () => {
    const domainFiles = walk(join(SERVER_DIR, "domain"));
    const violations = domainFiles.flatMap((f) =>
      importStatements(f)
        .filter((i) => /gmailConnection|integrations\/email\/(gmail|types)/.test(i.spec) && !isTypeOnlyImport(i.statement))
        .map((i) => `${f}: ${i.spec}`)
    );
    expect(violations).toEqual([]);
  });
});