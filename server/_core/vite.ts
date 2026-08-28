import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import tailwindcss from "@tailwindcss/vite";

// The bundled production server lives in dist/, so a root derived from this
// module's URL resolves one directory too high. Package scripts launch from
// the repository root; an explicit override supports unusual launch contexts.
const PROJECT_ROOT = path.resolve(process.env.NIGHTFALL_PROJECT_ROOT || process.cwd());

// Aliases are declared here explicitly (mirroring vite.config.ts) because
// middleware-mode instances must not depend on config-file resolution.
const alias = {
  "@": path.resolve(PROJECT_ROOT, "client", "src"),
  "@shared": path.resolve(PROJECT_ROOT, "shared"),
  "@assets": path.resolve(PROJECT_ROOT, "attached_assets"),
};

export async function setupVite(app: express.Express, server: import("http").Server) {
  const vite = await createViteServer({
    root: path.resolve(PROJECT_ROOT, "client"),
    server: { middlewareMode: true },
    appType: "spa",
    plugins: [tailwindcss()],
    resolve: { alias },
  });
  app.use(vite.middlewares);
}

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(PROJECT_ROOT, "dist", "public");
  app.use(express.static(distPath));
  app.get("*", (req: express.Request, res: express.Response) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
