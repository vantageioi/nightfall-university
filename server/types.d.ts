// The mammoth package is present at runtime in production installs but its
// extraction was corrupted on this machine; it is only ever loaded lazily
// (see adminIntake.ts) with a graceful fallback, so a bare declaration keeps
// TypeScript happy without requiring the module to resolve statically.
declare module "mammoth";
