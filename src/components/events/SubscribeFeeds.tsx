import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Copy,
  Download,
  Rss,
  Check,
  Apple,
  Filter,
  X,
  Mail,
  Link2,
  ShieldOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/events";

/**
 * Subscribe-to-calendar block with category + location filters.
 *
 * Filters are encoded into the feed URL as query params (types, regions,
 * cities, free), so the same calendar subscription stays scoped to what
 * the user picked here.
 */
export const SubscribeFeeds = () => {
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

  const [types, setTypes] = useState<Set<EventType>>(
    new Set(["workshop", "meetup", "contest"])
  );
  const [regions, setRegions] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<Set<string>>(new Set());
  const [freeOnly, setFreeOnly] = useState(false);

  // Available regions/cities from currently-published events
  const [allRegions, setAllRegions] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("region, city")
        .eq("status", "published")
        .limit(1000);
      if (cancelled || !data) return;
      const r = new Set<string>();
      const c = new Set<string>();
      for (const row of data) {
        if (row.region) r.add(row.region.trim());
        if (row.city) c.add(row.city.trim());
      }
      setAllRegions([...r].sort());
      setAllCities([...c].sort());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { httpsUrl, webcalUrl, rssUrl } = useMemo(() => {
    const base = `https://${projectRef}.functions.supabase.co/feeds`;
    const params = new URLSearchParams();
    const site =
      typeof window !== "undefined" ? window.location.origin : "";
    if (site) params.set("site", site);

    if (types.size > 0 && types.size < 3) {
      params.set("types", [...types].join(","));
    }
    if (regions.size > 0) params.set("regions", [...regions].join(","));
    if (cities.size > 0) params.set("cities", [...cities].join(","));
    if (freeOnly) params.set("free", "1");

    const qs = params.toString();
    const httpsUrl = `${base}${qs ? `?${qs}` : ""}`;
    const webcalUrl = `webcal://${projectRef}.functions.supabase.co/feeds${
      qs ? `?${qs}` : ""
    }`;
    const rssParams = new URLSearchParams(params);
    rssParams.set("format", "rss");
    const rssUrl = `${base}?${rssParams.toString()}`;
    return { httpsUrl, webcalUrl, rssUrl };
  }, [projectRef, types, regions, cities, freeOnly]);

  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    httpsUrl
  )}`;

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  };

  const clearAll = () => {
    setTypes(new Set(["workshop", "meetup", "contest"]));
    setRegions(new Set());
    setCities(new Set());
    setFreeOnly(false);
  };

  const filterCount =
    (types.size < 3 ? 1 : 0) +
    (regions.size > 0 ? 1 : 0) +
    (cities.size > 0 ? 1 : 0) +
    (freeOnly ? 1 : 0);

  return (
    <div className="border border-hairline/70 bg-cream-mid">
      <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
        <div className="flex h-12 w-12 items-center justify-center bg-navy text-cream">
          <Calendar className="h-6 w-6" />
        </div>

        <div>
          <p className="label-caps text-red">Stay in the loop</p>
          <h2 className="mt-1 font-display text-2xl text-navy md:text-3xl">
            Subscribe to the calendar
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Add the events you care about to your calendar app once — new ones
            show up automatically. Pick categories and locations below to scope
            your subscription.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <a
            href={webcalUrl}
            className="label-caps inline-flex items-center gap-1.5 bg-navy px-4 py-2.5 text-cream hover:bg-navy/90"
          >
            <Apple className="h-4 w-4" /> Apple / iOS
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label-caps inline-flex items-center gap-1.5 bg-red px-4 py-2.5 text-cream hover:bg-red-dark"
          >
            <Calendar className="h-4 w-4" /> Google Calendar
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="border-t border-hairline/70 bg-cream p-6 md:p-8">
        <div className="flex items-center justify-between">
          <p className="label-caps inline-flex items-center gap-2 text-navy">
            <Filter className="h-3.5 w-3.5 text-red" /> Scope this feed
            {filterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center bg-red px-1.5 text-[10px] text-cream">
                {filterCount}
              </span>
            )}
          </p>
          {filterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="label-caps inline-flex items-center gap-1 text-muted-foreground hover:text-red"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-3">
          {/* Types */}
          <div>
            <p className="label-caps mb-2 text-muted-foreground">Categories</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((t) => {
                const active = types.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(types, t, setTypes)}
                    className={
                      "label-caps border px-3 py-1.5 transition-colors " +
                      (active
                        ? "border-red bg-red text-cream"
                        : "border-hairline bg-cream text-navy hover:border-red")
                    }
                  >
                    {EVENT_TYPE_LABEL[t]}
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--red))]"
              />
              Free events only
            </label>
          </div>

          {/* Regions */}
          <ChipGroup
            label="Regions / states"
            empty="No regions yet"
            options={allRegions}
            selected={regions}
            onToggle={(v) => toggle(regions, v, setRegions)}
          />

          {/* Cities */}
          <ChipGroup
            label="Cities"
            empty="No cities yet"
            options={allCities}
            selected={cities}
            onToggle={(v) => toggle(cities, v, setCities)}
          />
        </div>
      </div>

      {/* URLs */}
      <div className="grid gap-px border-t border-hairline/70 bg-hairline/40 md:grid-cols-3">
        <FeedRow
          label="Subscribe URL"
          hint="Outlook, Fantastical, anything that takes a webcal/ICS link"
          value={httpsUrl}
          copied={copied === "ics"}
          onCopy={() => copy("ics", httpsUrl)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <FeedRow
          label="Download .ics"
          hint="One-time export of matching events"
          value={httpsUrl}
          copied={copied === "dl"}
          onCopy={() => copy("dl", httpsUrl)}
          icon={<Download className="h-4 w-4" />}
          downloadHref={httpsUrl}
        />
        <FeedRow
          label="RSS feed"
          hint="For readers like Feedly or NetNewsWire"
          value={rssUrl}
          copied={copied === "rss"}
          onCopy={() => copy("rss", rssUrl)}
          icon={<Rss className="h-4 w-4" />}
        />
      </div>

      {/* Personal link + unsubscribe notice */}
      <PersonalLinkBlock
        types={types}
        regions={regions}
        cities={cities}
        freeOnly={freeOnly}
      />
    </div>
  );
};

const PersonalLinkBlock = ({
  types,
  regions,
  cities,
  freeOnly,
}: {
  types: Set<EventType>;
  regions: Set<string>;
  cities: Set<string>;
  freeOnly: boolean;
}) => {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ics_url: string;
    webcal_url: string;
    rss_url: string;
    manage_url: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("feed-subscribe", {
      body: {
        email,
        label: label || null,
        filter_types: types.size < 3 ? [...types] : null,
        filter_regions: regions.size > 0 ? [...regions] : null,
        filter_cities: cities.size > 0 ? [...cities] : null,
        filter_free_only: freeOnly,
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      setError((data as any)?.error || "Could not create link");
      return;
    }
    setResult(data as any);
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="border-t border-hairline/70 bg-cream-mid p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="label-caps text-red">Personal subscription link</p>
          <h3 className="mt-1 font-display text-xl text-navy">
            Get a revocable link by email
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tied to your email so you can revoke it later if you switch
            calendar apps or want to stop syncing. The link itself is the only
            secret — anyone with it gets the same scoped events.
          </p>

          {!result ? (
            <form onSubmit={create} className="mt-4 flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border border-hairline bg-cream px-3 py-2 text-navy outline-none focus:border-red"
              />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (optional, e.g. Work laptop)"
                maxLength={120}
                className="border border-hairline bg-cream px-3 py-2 text-navy outline-none focus:border-red"
              />
              <button
                type="submit"
                disabled={loading}
                className="label-caps inline-flex items-center justify-center gap-2 bg-navy px-4 py-2.5 text-cream hover:bg-navy/90 disabled:opacity-60"
              >
                <Link2 className="h-4 w-4" />
                {loading ? "Creating…" : "Create my link"}
              </button>
              {error && <p className="text-sm text-red">{error}</p>}
            </form>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-navy">
                <Check className="mr-1 inline h-4 w-4 text-red" /> Link created
                — save the manage URL somewhere safe.
              </p>
              <button
                onClick={() => copy("personal-ics", result.webcal_url)}
                className="label-caps flex w-full items-center justify-between border border-hairline/70 bg-cream px-3 py-2 text-left text-xs text-navy hover:border-red"
              >
                <span className="truncate">{result.webcal_url}</span>
                <span className="ml-2 shrink-0 text-red">
                  {copied === "personal-ics" ? "Copied" : "Copy webcal"}
                </span>
              </button>
              <button
                onClick={() => copy("personal-manage", result.manage_url)}
                className="label-caps flex w-full items-center justify-between border border-hairline/70 bg-cream px-3 py-2 text-left text-xs text-navy hover:border-red"
              >
                <span className="truncate">{result.manage_url}</span>
                <span className="ml-2 shrink-0 text-red">
                  {copied === "personal-manage" ? "Copied" : "Copy manage URL"}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="border border-hairline/70 bg-cream p-5">
          <p className="label-caps inline-flex items-center gap-1.5 text-navy">
            <ShieldOff className="h-3.5 w-3.5 text-red" /> How to unsubscribe
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-navy">In your calendar app:</strong>{" "}
              right-click the calendar in the sidebar (Apple Calendar, Google
              Calendar, Outlook) and choose <em>Delete</em> or{" "}
              <em>Unsubscribe</em>. The events vanish on next sync.
            </li>
            <li>
              <strong className="text-navy">Public feed URL:</strong> nothing
              to revoke — just remove it from your calendar app. We don't know
              who's subscribed.
            </li>
            <li>
              <strong className="text-navy">Personal link:</strong> open{" "}
              <Link to="/feeds/manage" className="text-red underline">
                /feeds/manage
              </Link>{" "}
              to revoke server-side. The next sync will return an empty feed.
            </li>
          </ul>
          <Link
            to="/feeds/manage"
            className="label-caps mt-4 inline-flex items-center gap-1.5 border border-navy px-3 py-2 text-navy hover:bg-navy hover:text-cream"
          >
            <Mail className="h-3.5 w-3.5" /> Manage my subscriptions
          </Link>
        </div>
      </div>
    </div>
  );
};

const ChipGroup = ({
  label,
  empty,
  options,
  selected,
  onToggle,
}: {
  label: string;
  empty: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) => (
  <div>
    <p className="label-caps mb-2 text-muted-foreground">{label}</p>
    {options.length === 0 ? (
      <p className="text-xs text-muted-foreground">{empty}</p>
    ) : (
      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((o) => {
          const active = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={
                "border px-2.5 py-1 text-xs transition-colors " +
                (active
                  ? "border-navy bg-navy text-cream"
                  : "border-hairline bg-cream text-navy hover:border-navy")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    )}
    {selected.size === 0 && options.length > 0 && (
      <p className="mt-2 text-[11px] text-muted-foreground">
        Leave empty to include all
      </p>
    )}
  </div>
);

const FeedRow = ({
  label,
  hint,
  value,
  copied,
  onCopy,
  icon,
  downloadHref,
}: {
  label: string;
  hint: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  icon: React.ReactNode;
  downloadHref?: string;
}) => (
  <div className="flex flex-col gap-2 bg-cream p-5">
    <div className="flex items-center gap-2 text-navy">
      <span className="text-red">{icon}</span>
      <span className="label-caps">{label}</span>
    </div>
    <p className="text-xs text-muted-foreground">{hint}</p>
    <div className="mt-auto flex items-stretch border border-hairline/70 bg-cream-mid">
      <code className="flex-1 truncate px-3 py-2 text-[11px] text-navy/80">
        {value}
      </code>
      {downloadHref ? (
        <a
          href={downloadHref}
          download="yoyo-events.ics"
          className="label-caps inline-flex items-center gap-1 border-l border-hairline/70 bg-cream px-3 py-2 text-navy hover:bg-cream-mid"
          aria-label={`Download ${label}`}
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      ) : (
        <button
          type="button"
          onClick={onCopy}
          className="label-caps inline-flex items-center gap-1 border-l border-hairline/70 bg-cream px-3 py-2 text-navy hover:bg-cream-mid"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-red" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      )}
    </div>
  </div>
);
