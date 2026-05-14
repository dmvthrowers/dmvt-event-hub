import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flag, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MinimalEvent {
  id: string;
  slug: string;
  title: string;
  venue_name: string;
  city: string | null;
}

const REASONS = [
  "Spam or misleading",
  "Event has been cancelled",
  "Wrong location or date",
  "Inappropriate content",
  "Duplicate listing",
  "Other",
] as const;

type Reason = typeof REASONS[number];

export const ReportEventPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Reason>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["report-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, slug, title, venue_name, city")
        .eq("id", eventId!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as MinimalEvent | null;
    },
    enabled: !!eventId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (details.trim().length < 10) {
      toast.error("Please add at least 10 characters of detail.");
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("report-event", {
      body: {
        event_id: event.id,
        reason: category,
        details: details.trim(),
        reporter_email: reporterEmail.trim() || null,
      },
    });

    setSubmitting(false);

    if (error || data?.error) {
      const code = data?.error;
      if (code === "rate_limited") {
        toast.error("You've submitted several reports recently. Please try again later.");
      } else {
        toast.error("Could not submit report. Please try again.");
      }
      return;
    }

    toast.success("Report submitted. Thank you — our team will review it.");
    navigate(`/events/${event.slug}`);
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-red" />
        </div>
      </SiteLayout>
    );
  }

  if (!event) {
    return (
      <SiteLayout>
        <section className="container-dmvt section-pad text-center">
          <p className="label-caps text-red">Not found</p>
          <h1 className="mt-3 font-display text-3xl text-navy">Event unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            We can't find this event. It may have been removed already.
          </p>
          <Link to="/events" className="label-caps mt-6 inline-block text-red underline">
            ← Back to all events
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-2xl">
        <Link
          to={`/events/${event.slug}`}
          className="label-caps inline-flex items-center gap-1 text-muted-foreground hover:text-red"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to event
        </Link>

        <div className="mt-6 flex items-start gap-3">
          <div className="rounded border border-red/30 bg-red/5 p-2 text-red">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <p className="label-caps text-red">Report event</p>
            <h1 className="mt-1 font-display text-3xl text-navy">{event.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {event.venue_name}
              {event.city ? ` · ${event.city}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-6 border border-hairline bg-cream-mid p-4 text-sm text-navy">
          Reports are reviewed by the DMV Throwers team. Please don't use this form for
          personal disputes — for organizer questions, contact them directly from the event
          page.
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category" className="label-caps text-navy">
              Reason
            </Label>
            <select
              id="category"
              aria-label="Reason"
              value={category}
              onChange={(e) => setCategory(e.target.value as Reason)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="label-caps text-navy">
              Details <span className="text-red">*</span>
            </Label>
            <Textarea
              id="details"
              required
              minLength={10}
              maxLength={2000}
              rows={6}
              placeholder="Tell us what's wrong with this listing…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/2000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="label-caps text-navy">
              Your email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only used if we need to follow up. Never shared publicly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit report
            </Button>
            <Link
              to={`/events/${event.slug}`}
              className="label-caps text-muted-foreground hover:text-red"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
};

export default ReportEventPage;
