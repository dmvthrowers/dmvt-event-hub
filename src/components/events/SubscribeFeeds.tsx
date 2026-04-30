import { useMemo, useState } from "react";
import { Calendar, Copy, Download, Rss, Check, Apple } from "lucide-react";

/**
 * Subscribe-to-calendar block.
 *
 * Builds public feed URLs from the Supabase project ref and exposes:
 *   - webcal:// link (one-tap subscribe in Apple Calendar / iOS / Outlook)
 *   - https:// link (Google Calendar "from URL")
 *   - .ics download
 *   - RSS feed
 *
 * The feed updates automatically as new events are published — users
 * subscribe once and their calendar stays in sync.
 */
export const SubscribeFeeds = () => {
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

  const { httpsUrl, webcalUrl, rssUrl } = useMemo(() => {
    const base = `https://${projectRef}.functions.supabase.co/feeds`;
    const site =
      typeof window !== "undefined" ? window.location.origin : "";
    const siteParam = site ? `?site=${encodeURIComponent(site)}` : "";
    const rssSep = siteParam ? "&" : "?";
    return {
      httpsUrl: `${base}${siteParam}`,
      webcalUrl: `webcal://${projectRef}.functions.supabase.co/feeds${siteParam}`,
      rssUrl: `${base}${siteParam}${rssSep}format=rss`,
    };
  }, [projectRef]);

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
            Add every event to your calendar app once — new events show up
            automatically as they're posted. No accounts, no spam.
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
          hint="One-time export of all upcoming events"
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
    </div>
  );
};

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
