import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/events";

interface Stats {
  total: number;
  pending: number;
  published: number;
  hidden: number;
  byType: Record<EventType, number>;
  reportsOpen: number;
  submitters: number;
  bannedSubmitters: number;
}

export const AdminStatsPage = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const [
        { data: events },
        { count: reportsOpen },
        { count: submitters },
        { count: bannedSubmitters },
      ] = await Promise.all([
        supabase.from("events").select("type, status").limit(2000),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("submitters").select("*", { count: "exact", head: true }),
        supabase.from("submitters").select("*", { count: "exact", head: true }).eq("banned", true),
      ]);

      const byType: Record<EventType, number> = { workshop: 0, meetup: 0, contest: 0 };
      let pending = 0;
      let published = 0;
      let hidden = 0;
      for (const e of events ?? []) {
        byType[e.type as EventType] = (byType[e.type as EventType] ?? 0) + 1;
        if (e.status === "pending") pending++;
        else if (e.status === "published") published++;
        else if (e.status === "hidden") hidden++;
      }

      setStats({
        total: events?.length ?? 0,
        pending,
        published,
        hidden,
        byType,
        reportsOpen: reportsOpen ?? 0,
        submitters: submitters ?? 0,
        bannedSubmitters: bannedSubmitters ?? 0,
      });
    };
    void load();
  }, []);

  if (!stats) {
    return (
      <AdminLayout>
        <p className="text-sm text-muted-foreground">Loading stats…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-navy">Stats</h1>
        <p className="text-sm text-muted-foreground">A quick pulse on the calendar.</p>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} accent={stats.pending > 0} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Hidden" value={stats.hidden} />
        <StatCard label="Open reports" value={stats.reportsOpen} accent={stats.reportsOpen > 0} />
        <StatCard label="Submitters" value={stats.submitters} />
        <StatCard label="Banned submitters" value={stats.bannedSubmitters} />
      </section>

      <section>
        <h2 className="label-caps mb-3 text-sm text-muted-foreground">By type</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(stats.byType) as EventType[]).map((t) => (
            <StatCard key={t} label={EVENT_TYPE_LABEL[t]} value={stats.byType[t]} />
          ))}
        </div>
      </section>
    </AdminLayout>
  );
};

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) => (
  <div
    className={`border border-hairline bg-card p-5 ${
      accent ? "border-l-4 border-l-red" : ""
    }`}
  >
    <div className="label-caps text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 font-display text-4xl font-black text-navy">{value}</div>
  </div>
);

export default AdminStatsPage;
