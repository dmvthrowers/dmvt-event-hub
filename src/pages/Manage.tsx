import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"] | null;

type LoadEventResponse = {
  error?: string;
  event?: Database["public"]["Tables"]["events"]["Row"];
};

export const ManagePage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [event, setEvent] = useState<Event>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }
    (async () => {
      const url = `https://gjthxhfnyigvihywibca.supabase.co/functions/v1/manage-event?token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const data = (await res.json()) as LoadEventResponse;
      if (!res.ok || data?.error) {
        setError(data?.error === "invalid_token" ? "This management link is invalid or revoked." : "Couldn't load event.");
      } else {
        setEvent(data.event);
      }
      setLoading(false);
    })();
  }, [token]);

  const update = (k: string, v: unknown) =>
    setEvent((e) => (e ? { ...e, [k]: v } : e));

  const save = async () => {
    if (!event) return;
    setSaving(true);
    const patch: Record<string, unknown> = {
      title: event.title,
      description: event.description,
      venue_name: event.venue_name,
      address: event.address,
      city: event.city,
      region: event.region,
      country: event.country,
      start_date: event.start_date,
      end_date: event.end_date,
      all_day: event.all_day,
      start_time: event.all_day ? null : event.start_time,
      end_time: event.all_day ? null : event.end_time,
      is_free: event.is_free,
      cost_amount: event.is_free ? null : Number(event.cost_amount || 0),
      info_url: event.info_url || null,
      image_url: event.image_url || null,
      public_contact: event.public_contact || null,
    };
    const { data, error } = await supabase.functions.invoke("manage-event", {
      body: { token, action: "update", patch },
    });
    setSaving(false);
    if (error || data?.error) {
      toast({
        title: "Save failed",
        description: data?.error || error?.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Saved", description: "Your event was updated." });
  };

  const cancel = async () => {
    const { data, error } = await supabase.functions.invoke("manage-event", {
      body: { token, action: "cancel" },
    });
    if (error || data?.error) {
      toast({ title: "Failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Event cancelled" });
    setEvent((e) => (e ? { ...e, status: "cancelled" } : e));
  };

  if (loading) {
    return (
      <SiteLayout>
        <section className="container-dmvt section-pad text-center">
          <p className="label-caps text-muted-foreground">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (error || !event) {
    return (
      <SiteLayout>
        <section className="container-dmvt section-pad max-w-xl text-center">
          <p className="label-caps text-red">Problem</p>
          <h1 className="mt-2 text-4xl text-navy">Can't open this event</h1>
          <p className="mt-4 text-muted-foreground">{error}</p>
          <Link to="/" className="mt-8 inline-block border-2 border-navy bg-navy px-6 py-3 text-cream">
            Home
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-3xl">
        <p className="label-caps text-red">Manage Event</p>
        <h1 className="mt-2 text-4xl text-navy md:text-5xl">{event.title}</h1>
        <p className="mt-3 text-muted-foreground">
          Status:{" "}
          <span className="font-semibold uppercase text-navy">{event.status}</span>
        </p>

        <div className="mt-8 space-y-5 border border-hairline bg-white p-6 md:p-8">
          <Field label="Title">
            <Input value={event.title} onChange={(e) => update("title", e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={6} value={event.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
          <Field label="Venue">
            <Input value={event.venue_name} onChange={(e) => update("venue_name", e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={event.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="City"><Input value={event.city ?? ""} onChange={(e) => update("city", e.target.value)} /></Field>
            <Field label="Region"><Input value={event.region ?? ""} onChange={(e) => update("region", e.target.value)} /></Field>
            <Field label="Country"><Input value={event.country ?? ""} onChange={(e) => update("country", e.target.value)} /></Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Start date"><Input type="date" value={event.start_date} onChange={(e) => update("start_date", e.target.value)} /></Field>
            <Field label="End date"><Input type="date" value={event.end_date} onChange={(e) => update("end_date", e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-3">
            <Checkbox checked={!!event.all_day} onCheckedChange={(v) => update("all_day", Boolean(v))} />
            <span className="font-medium">All day</span>
          </label>
          {!event.all_day && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Start time"><Input type="time" value={event.start_time ?? ""} onChange={(e) => update("start_time", e.target.value)} /></Field>
              <Field label="End time"><Input type="time" value={event.end_time ?? ""} onChange={(e) => update("end_time", e.target.value)} /></Field>
            </div>
          )}
          <label className="flex items-center gap-3">
            <Checkbox checked={!!event.is_free} onCheckedChange={(v) => update("is_free", Boolean(v))} />
            <span className="font-medium">Free</span>
          </label>
          {!event.is_free && (
            <Field label="Cost (USD)">
              <Input type="number" min="0" step="0.01" value={event.cost_amount ?? ""} onChange={(e) => update("cost_amount", e.target.value)} />
            </Field>
          )}
          <Field label="Info / signup URL"><Input type="url" value={event.info_url ?? ""} onChange={(e) => update("info_url", e.target.value)} /></Field>
          <Field label="Cover image URL"><Input type="url" value={event.image_url ?? ""} onChange={(e) => update("image_url", e.target.value)} /></Field>
          <Field label="Public contact"><Input value={event.public_contact ?? ""} onChange={(e) => update("public_contact", e.target.value)} /></Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red text-red hover:bg-red hover:text-cream">
                  Cancel event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It'll be removed from the calendar, list, and map. You can't undo this from this link.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction onClick={cancel}>Yes, cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold uppercase tracking-wider text-navy">{label}</Label>
    {children}
  </div>
);

export default ManagePage;
