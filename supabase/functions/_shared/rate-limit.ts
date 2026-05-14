// Server-side rate limiting via Upstash Redis REST API.
// Uses a sliding window: accurate across window boundaries, no burst at resets.
//
// Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
//   UPSTASH_REDIS_REST_URL   e.g. https://xxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN e.g. AXxx...
//
// If either var is absent (local dev, staging without Redis) the check is
// skipped with a console.warn and the request is allowed through.

const UPSTASH_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

/**
 * Returns false when the caller has exceeded `max` requests in the last
 * `windowSeconds` seconds for the given `action`. Returns true (allow) when
 * Redis is unreachable or unconfigured — fail open keeps the service up.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn(`[rate-limit] Redis not configured — skipping check for ${action}`);
    return true;
  }

  const key = `rl:${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Sliding window via sorted set:
  //   1. Remove members older than the window
  //   2. Add this request (score = timestamp, member = unique)
  //   3. Count members in the window
  //   4. Reset TTL so the key expires after inactivity
  const pipeline = [
    ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
    ["ZADD", key, String(now), `${now}:${crypto.randomUUID()}`],
    ["ZCARD", key],
    ["EXPIRE", key, String(windowSeconds)],
  ];

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      console.error(`[rate-limit] Upstash returned ${res.status} for ${action}`);
      return true; // fail open
    }

    const data = await res.json() as Array<{ result: unknown }>;
    const count = typeof data[2]?.result === "number" ? data[2].result : 0;
    return count <= max;
  } catch (err) {
    console.error(`[rate-limit] fetch failed for ${action}:`, err);
    return true; // fail open
  }
}

/**
 * Extracts the real client IP from Vercel/Supabase edge headers.
 * x-real-ip is set by Vercel's network and is not client-spoofable in production.
 * Falls back to x-forwarded-for (first entry), then "unknown".
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}
