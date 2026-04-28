import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/events";

interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  status: string;
  start_date: string;
  end_date: string;
  city: string | null;
  region: string | null;
  organizer_name: string;
  expires_at: string;
}

const STATUSES = ["all", "pending", "published", "hidden", "expired"] as const;

export const AdminEventsPage = () => {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, slug, title, type, status, start_date, end_date, city, region, organizer_name, expires_at"
      )
      .order("start_date", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEvents((data ?? []) as AdminEvent[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.organizer_name} ${e.city ?? ""} ${e.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, statusFilter, search]);

  const setStatus = async (id: string, status: "pending" | "published" | "hidden" | "expired") => {
    const patch =
      status === "published"
        ? { status, published_at: new Date().toISOString() }
        : { status };
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setEvents((es) => es.filter((e) => e.id !== id));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-navy">All Events</h1>
        <p className="text-sm text-muted-foreground">
          Manage every submission. Showing {filtered.length} of {events.length}.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search title, organizer, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link to={`/events/${e.slug}`} className="font-medium hover:text-red">
                    {e.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{e.organizer_name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="label-caps">
                    {EVENT_TYPE_LABEL[e.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={e.status === "published" ? "default" : "outline"}
                    className="label-caps"
                  >
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{e.start_date}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[e.city, e.region].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {e.status !== "published" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(e.id, "published")}>
                        Publish
                      </Button>
                    )}
                    {e.status !== "hidden" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(e.id, "hidden")}>
                        Hide
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{e.title}" and all related
                            occurrences. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(e.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No events match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminEventsPage;
