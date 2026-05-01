// Email-based recovery + revocation for feed subscription tokens.
//
// Actions:
//   POST { action: "request", email }
//     -> mints a feed_manage_token (1h), "emails" the manage link.
//   POST { action: "list", manage_token }
//     -> returns active subscriptions for that email (token shown masked).
//   POST { action: "revoke", manage_token, subscription_id }
//     -> marks the subscription revoked.
//   POST { action: "revoke_one", token }
//     -> revokes a single subscription by its raw subscribe token
//        (used when the user has the link itself).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { newToken } from "../_shared/tokens.ts";
import { sendMail } from "../_shared/email-stub.ts";
import { getSiteUrl } from "../_shared/site-url.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mask(token: string) {
  if (token.length <= 8) return "••••";
  return token.slice(0, 4) + "…" + token.slice(-4);
}

async function resolveEmail(
  supabase: ReturnType<typeof createClient>,
  manageToken: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("feed_manage_tokens")
    .select("email, expires_at, consumed_at")
    .eq("token", manageToken)
    .maybeSingle();
  if (error || !data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return (data.email as string).toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "request") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({ error: "Invalid email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Always respond ok to avoid email enumeration.
      const { data: subs } = await supabase
        .from("feed_subscriptions")
        .select("id")
        .eq("email", email)
        .is("revoked_at", null)
        .limit(1);
      if (subs && subs.length > 0) {
        const token = newToken(24);
        await supabase.from("feed_manage_tokens").insert({ email, token });
        const manage_url = `${getSiteUrl()}/feeds/manage?mt=${token}`;
        await sendMail({
          to: email,
          template: "feed-manage-link",
          data: { manage_url },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const email = await resolveEmail(supabase, String(body.manage_token || ""));
      if (!email) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("feed_subscriptions")
        .select(
          "id, token, label, filter_types, filter_regions, filter_cities, filter_free_only, created_at, last_accessed_at, revoked_at"
        )
        .eq("email", email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(
        JSON.stringify({
          email,
          subscriptions: (data ?? []).map((s) => ({
            ...s,
            token_masked: mask(s.token as string),
            token: undefined,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "revoke") {
      const email = await resolveEmail(supabase, String(body.manage_token || ""));
      if (!email) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const id = String(body.subscription_id || "");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing subscription_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("feed_subscriptions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("email", email);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke_one") {
      const token = String(body.token || "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("feed_subscriptions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token", token)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: !!data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-feed-subscription error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
