import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/events";

interface PendingEvent {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  description: string;
  organizer_name: string;
  submitter_email: string;
  venue_name: string;
  city: string | null;
  region: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  status: string;
}

async function adminAction(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-action", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Action failed");
  return data;
}

export const AdminQueuePage = () => {
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, slug, title, type, description, organizer_name, submitter_email, venue_name, city, region, start_date, end_date, created_at, status"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPending((data ?? []) as PendingEvent[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: "published" | "hidden") => {
    try {
      await adminAction({
        action: status === "published" ? "publish_event" : "hide_event",
        event_id: id,
      });
      toast.success(status === "published" ? "Event published" : "Event hidden");
      setPending((p) => p.filter((e) => e.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-navy">Submission Queue</h1>
          <p className="text-sm text-muted-foreground">
            Pending submissions awaiting verification or admin approval.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && pending.length === 0 && (
        <div className="border border-hairline bg-card p-12 text-center">
          <p className="text-muted-foreground">No pending submissions.</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((e) => (
          <article key={e.id} className="border border-hairline bg-card p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="label-caps">
                    {EVENT_TYPE_LABEL[e.type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-navy">{e.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {e.venue_name}
                  {e.city ? ` · ${e.city}` : ""}
                  {e.region ? `, ${e.region}` : ""} · {e.start_date}
                  {e.end_date !== e.start_date ? ` – ${e.end_date}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateStatus(e.id, "published")}>
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(e.id, "hidden")}
                >
                  Hide
                </Button>
              </div>
            </div>
            <p className="mb-2 line-clamp-3 text-sm text-foreground">{e.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                <strong>Organizer:</strong> {e.organizer_name}
              </span>
              <span>
                <strong>Submitter:</strong> {e.submitter_email}
              </span>
              <Link to={`/events/${e.slug}`} className="text-red hover:underline">
                Preview →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminQueuePage;
