// URL-safe random token generator (no padding, base64url-ish).
export function newToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let str = "";
  for (const b of buf) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// SHA-256 hex digest. Store this in the DB instead of the raw token so a
// DB read doesn't give an attacker usable tokens.
export async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison. Prevents timing oracles when comparing
// secrets like CRON_SECRET or manage-token values.
export function timingSafeEqual(a: string, b: string): boolean {
  const ta = new TextEncoder().encode(a);
  const tb = new TextEncoder().encode(b);
  if (ta.length !== tb.length) {
    // Still iterate to avoid length-based timing leaks.
    let diff = 0;
    for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
      diff |= (ta[i] ?? 0) ^ (tb[i] ?? 0);
    }
    return diff === 0 && ta.length === tb.length;
  }
  let diff = 0;
  for (let i = 0; i < ta.length; i++) diff |= ta[i] ^ tb[i];
  return diff === 0;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "event";
}
