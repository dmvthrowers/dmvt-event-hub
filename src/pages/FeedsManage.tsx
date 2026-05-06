import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ShieldOff, Trash2, Check } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type Sub = {
  id: string;
  label: string | null;
  token_masked: string;
  filter_types: string[] | null;
  filter_regions: string[] | null;
  filter_cities: string[] | null;
  filter_free_only: boolean;
  created_at: string;
  last_accessed_at: string | null;
  revoked_at: string | null;
};

export const FeedsManagePage = () => {
  const [params] = useSearchParams();
  const mt = params.get("mt"); // magic-link manage token
  const directToken = params.get("token"); // raw subscription token

  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [directRevoked, setDirectRevoked] = useState<boolean | null>(null);

  // 1) If arriving with `?token=...`, offer one-click revoke.
  useEffect(() => {
    if (!directToken || mt) return;
    setDirectRevoked(false);
  }, [directToken, mt]);

  // 2) If arriving with `?mt=...`, list this email's subscriptions.
  useEffect(() => {
    if (!mt) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke(
        "manage-feed-subscription",
        { body: { action: "list", manage_token: mt } }
      );
      setLoading(false);
      if (error || (data as any)?.error) {
        setError((data as any)?.error || "Could not load subscriptions");
        return;
      }
      setSessionEmail((data as any).email);
      setSubs((data as any).subscriptions);
    })();
  }, [mt]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.functions.invoke(
      "manage-feed-subscription",
      { body: { action: "request", email } }
    );
    setLoading(false);
    if (error) {
      setError("Could not send manage link. Try again.");
      return;
    }
    setRequested(true);
  };

  const revokeOne = async () => {
    if (!directToken) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "manage-feed-subscription",
      { body: { action: "revoke_one", token: directToken } }
    );
    setLoading(false);
    if (error || (data as any)?.error) {
      setError("Could not revoke. The link may already be revoked.");
      return;
    }
    setDirectRevoked(true);
  };

  const revokeFromList = async (id: string) => {
    if (!mt) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke(
      "manage-feed-subscription",
      { body: { action: "revoke", manage_token: mt, subscription_id: id } }
    );
    setLoading(false);
    if (error) {
      setError("Could not revoke that subscription.");
      return;
    }
    setSubs((prev) =>
      prev?.map((s) =>
        s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s
      ) ?? null
    );
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Breadcrumbs
          items={[
            { label: "Subscribe", to: "/subscribe" },
            { label: "Manage subscriptions" },
          ]}
        />

        <h1 className="mt-4 font-display text-4xl text-navy md:text-5xl">
          Manage your subscriptions
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Personal subscription links you generated are listed here. Revoke any
          link to immediately stop new events from syncing into the calendar
          app it was added to.
        </p>

        {error && (
          <p className="mt-6 border border-red bg-red/10 px-4 py-3 text-sm text-red">
            {error}
          </p>
        )}

        {/* Direct revoke flow (?token=...) */}
        {directToken && !mt && (
          <div className="mt-10 border border-hairline/70 bg-cream-mid p-6 md:p-8">
            <p className="label-caps text-red">Revoke this link</p>
            <h2 className="mt-1 font-display text-2xl text-navy">
              Stop this calendar feed
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently disable the personal feed link you arrived
              with. Calendar apps already subscribed will receive an empty feed
              on their next sync.
            </p>
            {directRevoked ? (
              <p className="mt-5 inline-flex items-center gap-2 text-navy">
                <Check className="h-4 w-4 text-red" /> Revoked. You can close
                this page.
              </p>
            ) : (
              <button
                onClick={revokeOne}
                disabled={loading}
                className="label-caps mt-5 inline-flex items-center gap-2 bg-red px-4 py-2.5 text-cream hover:bg-red-dark disabled:opacity-60"
              >
                <ShieldOff className="h-4 w-4" />
                {loading ? "Revoking…" : "Revoke this link"}
              </button>
            )}
          </div>
        )}

        {/* Email-based recovery flow */}
        {!mt && !directToken && (
          <form
            onSubmit={requestLink}
            className="mt-10 border border-hairline/70 bg-cream-mid p-6 md:p-8"
          >
            <p className="label-caps text-red">Lost your manage link?</p>
            <h2 className="mt-1 font-display text-2xl text-navy">
              Email me my subscriptions
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll send a one-hour magic link to the email you used when
              creating personal feeds. The link lets you view and revoke them.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 border border-hairline bg-cream px-4 py-2.5 text-navy outline-none focus:border-red"
              />
              <button
                type="submit"
                disabled={loading || requested}
                className="label-caps inline-flex items-center justify-center gap-2 bg-navy px-5 py-2.5 text-cream hover:bg-navy/90 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {requested ? "Check your inbox" : loading ? "Sending…" : "Send link"}
              </button>
            </div>
            {requested && (
              <p className="mt-3 text-sm text-muted-foreground">
                If a subscription exists for that address, a manage link is on
                its way. The link expires in 1 hour.
              </p>
            )}
          </form>
        )}

        {/* List + revoke flow (?mt=...) */}
        {mt && (
          <div className="mt-10">
            {sessionEmail && (
              <p className="label-caps text-muted-foreground">
                Signed in as <span className="text-navy">{sessionEmail}</span>
              </p>
            )}
            {loading && !subs && (
              <p className="mt-4 text-muted-foreground">Loading…</p>
            )}
            {subs && subs.length === 0 && (
              <p className="mt-4 text-muted-foreground">
                No active subscriptions on file.
              </p>
            )}
            <ul className="mt-4 divide-y divide-hairline/70 border border-hairline/70 bg-cream">
              {subs?.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {s.label || "Personal calendar feed"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Token {s.token_masked} · created{" "}
                      {new Date(s.created_at).toLocaleDateString()}
                      {s.last_accessed_at &&
                        ` · last sync ${new Date(
                          s.last_accessed_at
                        ).toLocaleDateString()}`}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      {s.filter_types?.map((t) => (
                        <span key={t} className="bg-navy/10 px-2 py-0.5 text-navy">
                          {t}
                        </span>
                      ))}
                      {s.filter_regions?.map((t) => (
                        <span key={t} className="bg-red/10 px-2 py-0.5 text-red">
                          {t}
                        </span>
                      ))}
                      {s.filter_cities?.map((t) => (
                        <span key={t} className="bg-red/10 px-2 py-0.5 text-red">
                          {t}
                        </span>
                      ))}
                      {s.filter_free_only && (
                        <span className="bg-navy/10 px-2 py-0.5 text-navy">
                          free only
                        </span>
                      )}
                    </p>
                  </div>
                  {s.revoked_at ? (
                    <span className="label-caps shrink-0 text-muted-foreground">
                      Revoked
                    </span>
                  ) : (
                    <button
                      onClick={() => revokeFromList(s.id)}
                      disabled={loading}
                      className="label-caps inline-flex shrink-0 items-center gap-1.5 border border-red px-3 py-2 text-red hover:bg-red hover:text-cream disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </SiteLayout>
  );
};

export default FeedsManagePage;
