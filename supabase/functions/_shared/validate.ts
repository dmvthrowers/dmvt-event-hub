import { z } from "npm:zod@3.23.8";

// Strips ASCII control characters (null bytes, BEL, ESC, etc.) from strings
// before Zod validates them. Without this, crafted inputs with \x00 can pass
// .min(N) checks while being stored or logged differently by different systems.
export const stripControls = z.string().transform((s) =>
  // deno-lint-ignore no-control-regex
  s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
);

// Convenience: string with control chars stripped, then trimmed.
export function safeString(max: number) {
  return stripControls.pipe(z.string().trim().max(max));
}
