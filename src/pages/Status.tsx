import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/seo/Seo";
import { cn } from "@/lib/utils";

type StatusLevel = "operational" | "degraded" | "outage" | "unknown";

interface ServiceStatus {
  name: string;
  category: string;
  level: StatusLevel;
  label: string | null;
  updated_at: string | null;
  status_url: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function fetchStatuses(): Promise<ServiceStatus[]> {
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
  const res = await fetch(`https://${projectRef}.functions.supabase.co/service-status`);
  if (!res.ok) throw new Error("fetch failed");
  const data = await res.json() as { services: ServiceStatus[] };
  return data.services;
}

function LevelDot({ level }: { level: StatusLevel }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", {
        "bg-emerald-500": level === "operational",
        "bg-amber-500":   level === "degraded",
        "bg-red-500":     level === "outage",
        "bg-slate-400":   level === "unknown",
      })}
      aria-hidden
    />
  );
}

function LevelPill({ level }: { level: StatusLevel }) {
  const label =
    level === "operational" ? "Operational"
    : level === "degraded"  ? "Degraded"
    : level === "outage"    ? "Outage"
    : "Unknown";

  return (
    <span
      className={cn("inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold", {
        "border-emerald-200 bg-emerald-50 text-emerald-900": level === "operational",
        "border-amber-200 bg-amber-50 text-amber-900":       level === "degraded",
        "border-red-200 bg-red-50 text-red-900":             level === "outage",
        "border-slate-200 bg-slate-50 text-slate-700":       level === "unknown",
      })}
    >
      <LevelDot level={level} />
      {label}
    </span>
  );
}

export const StatusPage = () => {
  const { data: services, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["service-status"],
    queryFn: fetchStatuses,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <SiteLayout>
      <Seo
        title="Service Status — YoYo Events"
        description="Live status of the services that power YoYo Events: Vercel, Supabase, Resend, and infrastructure partners."
        path="/status"
      />
      <section className="container-dmvt section-pad">
        <div className="max-w-3xl">
          <p className="label-caps text-red">Service Status</p>
          <h1 className="mt-3 font-display text-4xl font-black text-navy md:text-5xl">
            Platform Health
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Live status of the third-party services that power YoYo Events.
            Status is fetched every 5 minutes — refresh for the latest.
          </p>
          {dataUpdatedAt > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse border border-hairline bg-cream-mid" />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-10 border border-hairline bg-cream-mid p-6 text-sm text-muted-foreground">
            Could not load live status data. Check each vendor's status page directly.
          </div>
        )}

        {services && (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {services.map((svc) => (
              <section
                key={svc.name}
                className="border border-hairline bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-caps text-xs text-muted-foreground">{svc.category}</p>
                    <h2 className="mt-1 font-display text-2xl font-black text-navy">{svc.name}</h2>
                  </div>
                  <LevelPill level={svc.level} />
                </div>

                {svc.label && (
                  <p className="mt-3 text-sm text-muted-foreground">{svc.label}</p>
                )}

                {svc.updated_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Vendor update: {new Date(svc.updated_at).toLocaleString()}
                  </p>
                )}

                <div className="mt-4 border-t border-hairline pt-3">
                  <a
                    href={svc.status_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-caps text-xs text-red underline underline-offset-4 hover:no-underline"
                  >
                    {svc.name} status page ↗
                  </a>
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 border border-hairline bg-cream-mid p-4 text-sm text-muted-foreground">
          This page reflects vendor-reported status only. YoYo Events has no SLA with
          any of these providers and cannot control their availability. If you're
          experiencing an issue not shown here, email contact@dmvthrowers.club.
        </p>
      </section>
    </SiteLayout>
  );
};

export default StatusPage;
