import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authenticateRequest } from "./auth";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  try {
    const user = await authenticateRequest(req);
    return { req, res, user };
  } catch {
    return { req, res, user: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
export type TrpcContext = Context;
