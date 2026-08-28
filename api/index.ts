import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/app";

// Serverless instances reuse the resolved application when warm, while every
// request remains stateless because session, records, jobs, and objects live in
// their respective durable services.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as never, res as never);
}
