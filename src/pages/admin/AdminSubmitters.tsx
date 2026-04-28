import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Submitter {
  id: string;
  email: string;
  name: string | null;
  submission_count: number;
  banned: boolean;
  banned_reason: string | null;
  created_at: string;
}

export const AdminSubmittersPage = () => {
  const [rows, setRows] = useState<Submitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submitters")
      .select("id, email, name, submission_count, banned, banned_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Submitter[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleBan = async (s: Submitter) => {
    const next = !s.banned;
    const reason = next ? prompt("Reason for ban (optional):") ?? null : null;
    const { error } = await supabase
      .from("submitters")
      .update({ banned: next, banned_reason: reason })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Submitter banned" : "Ban lifted");
    setRows((r) => r.map((x) => (x.id === s.id ? { ...x, banned: next, banned_reason: reason } : x)));
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.email.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-navy">Submitters</h1>
        <p className="text-sm text-muted-foreground">
          People who have submitted events. Ban abusers to block future submissions.
        </p>
      </div>

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>First seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell>{s.name ?? "—"}</TableCell>
                <TableCell>{s.submission_count}</TableCell>
                <TableCell>
                  {s.banned ? (
                    <Badge variant="destructive" className="label-caps">
                      Banned
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="label-caps">
                      Active
                    </Badge>
                  )}
                  {s.banned_reason && (
                    <div className="mt-1 text-xs text-muted-foreground">{s.banned_reason}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => toggleBan(s)}>
                    {s.banned ? "Unban" : "Ban"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No submitters yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminSubmittersPage;
