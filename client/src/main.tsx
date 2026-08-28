import React from "react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

// Explicit registration ensures an already-installed client checks the current
// service worker at application start. With autoUpdate + skipWaiting,
// clientsClaim, and cleanupOutdatedCaches in vite.config, the next visit moves
// to the current shell instead of retaining a prior Journey release.
if (import.meta.env.PROD && "serviceWorker" in navigator) registerSW({ immediate: true });

// Auth travels exclusively in the HttpOnly session cookie — no token is
// ever mirrored into JS-readable storage (XSS-safe by construction).
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
