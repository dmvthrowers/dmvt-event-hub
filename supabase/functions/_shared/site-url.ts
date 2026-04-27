// Returns the canonical public site URL used to build email links.
//
// SECURITY: We must NOT derive this from the request `Origin` or `Referer`
// headers, because those are attacker-controlled and would let a malicious
// caller inject their own domain into verification/manage emails (open
// redirect → token theft).
//
// Configure the `SITE_URL` secret on the edge functions for production.
// The fallback is the Lovable preview URL for this project.

const FALLBACK_SITE_URL =
  "https://id-preview--f250471a-b5ea-42d2-9054-9891758b5f93.lovable.app";

export function getSiteUrl(): string {
  const configured = Deno.env.get("SITE_URL")?.trim();
  const url = configured && configured.length > 0 ? configured : FALLBACK_SITE_URL;
  return url.replace(/\/+$/, "");
}
