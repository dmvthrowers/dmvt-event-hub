import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Report {
  id: string;
  event_id: string;
  reason: string;
  reporter_email: string | null;
  status: string;
  created_at: string;
  event: { slug: string; title: string; status: string } | null;
}

export const AdminReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id, event_id, reason, reporter_email, status, created_at, event:events(slug, title, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReports((data ?? []) as unknown as Report[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const setReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Report updated");
  };

  const hideEvent = async (eventId: string, reportId: string) => {
    const { error } = await supabase.from("events").update({ status: "hidden" }).eq("id", eventId);
    if (error) return toast.error(error.message);
    await setReportStatus(reportId, "resolved");
    toast.success("Event hidden");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-navy">Reports</h1>
          <p className="text-sm text-muted-foreground">Abuse reports submitted by visitors.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {!loading && reports.length === 0 && (
        <div className="border border-hairline bg-card p-12 text-center">
          <p className="text-muted-foreground">No reports yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <article key={r.id} className="border border-hairline bg-card p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={r.status === "open" ? "destructive" : "outline"}
                    className="label-caps"
                  >
                    {r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-navy">
                  {r.event ? (
                    <Link to={`/events/${r.event.slug}`} className="hover:text-red">
                      {r.event.title}
                    </Link>
                  ) : (
                    "(deleted event)"
                  )}
                </h2>
                {r.reporter_email && (
                  <p className="text-xs text-muted-foreground">From: {r.reporter_email}</p>
                )}
              </div>
              <div className="flex gap-2">
                {r.status === "open" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => hideEvent(r.event_id, r.id)}>
                      Hide event
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReportStatus(r.id, "resolved")}>
                      Mark resolved
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReportStatus(r.id, "dismissed")}>
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap rounded-none border-l-2 border-red bg-cream-mid p-3 text-sm">
              {r.reason}
            </p>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminReportsPage;
