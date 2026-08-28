import type { IncomingMessage, ServerResponse } from "node:http";
// Vercel executes the compiled function as ESM. The explicit .js suffix maps
// to server/app.ts at build time and prevents Node from rejecting extensionless
// relative imports in the deployed lambda.
import { createApp } from "../server/app.js";

// Serverless instances reuse the resolved application when warm, while every
// request remains stateless because session, records, jobs, and objects live in
// their respective durable services.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as never, res as never);
}
