import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress, type GeocodeResult } from "@/lib/geocode";

type FormState = {
  title: string;
  description: string;
  type: "workshop" | "meetup" | "contest" | "fair" | "other";
  organizer_name: string;
  submitter_email: string;
  public_contact: string;
  venue_name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  recurrence: "none" | "weekly" | "biweekly" | "monthly";
  recurrence_until: string;
  is_free: boolean;
  cost_amount: string;
  age_min: string;
  age_label: string;
  skill_level: "beginner" | "intermediate" | "advanced" | "all";
  capacity: string;
  info_url: string;
  image_url: string;
  tags: string;
  website: string; // honeypot
};

const initialState: FormState = {
  title: "",
  description: "",
  type: "meetup",
  organizer_name: "",
  submitter_email: "",
  public_contact: "",
  venue_name: "",
  address: "",
  city: "",
  region: "",
  country: "",
  latitude: null,
  longitude: null,
  start_date: "",
  end_date: "",
  all_day: true,
  start_time: "",
  end_time: "",
  recurrence: "none",
  recurrence_until: "",
  is_free: true,
  cost_amount: "",
  age_min: "",
  age_label: "",
  skill_level: "all",
  capacity: "",
  info_url: "",
  image_url: "",
  tags: "",
  website: "",
};

export const SubmitPage = () => {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const navigate = useNavigate();

  // Auto end_date = start_date if blank
  useEffect(() => {
    if (form.start_date && !form.end_date) {
      setForm((f) => ({ ...f, end_date: f.start_date }));
    }
  }, [form.start_date, form.end_date]);

  // Debounced geocoding when address changes & we have no coords
  useEffect(() => {
    if (!form.address || form.address.length < 6) {
      setGeoResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setGeoLoading(true);
      const results = await geocodeAddress(
        [form.address, form.city, form.region, form.country].filter(Boolean).join(", "),
      );
      setGeoResults(results);
      setGeoLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [form.address, form.city, form.region, form.country]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickGeo = (g: GeocodeResult) => {
    update("latitude", g.lat);
    update("longitude", g.lon);
    if (g.address) {
      if (g.address.city || g.address.town || g.address.village) {
        update("city", g.address.city || g.address.town || g.address.village || "");
      }
      if (g.address.state) update("region", g.address.state);
      if (g.address.country) update("country", g.address.country);
    }
    setGeoResults([]);
    toast({ title: "Location pinned", description: g.display_name });
  };

  const stepOneValid = useMemo(
    () =>
      form.title.trim().length >= 3 &&
      form.description.trim().length >= 10 &&
      form.organizer_name.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(form.submitter_email),
    [form],
  );

  const stepTwoValid = useMemo(
    () =>
      form.venue_name.trim().length > 0 &&
      form.address.trim().length > 2 &&
      form.latitude !== null &&
      form.longitude !== null,
    [form],
  );

  const stepThreeValid = useMemo(() => {
    if (!form.start_date || !form.end_date) return false;
    if (new Date(form.end_date) < new Date(form.start_date)) return false;
    if (!form.all_day && (!form.start_time || !form.end_time)) return false;
    if (form.recurrence !== "none" && !form.recurrence_until) return false;
    return true;
  }, [form]);

  const handleSubmit = async () => {
    if (!stepOneValid || !stepTwoValid || !stepThreeValid) {
      toast({
        title: "Form incomplete",
        description: "Please review highlighted sections.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      organizer_name: form.organizer_name.trim(),
      submitter_email: form.submitter_email.trim().toLowerCase(),
      public_contact: form.public_contact.trim() || null,
      venue_name: form.venue_name.trim(),
      address: form.address.trim(),
      city: form.city.trim() || null,
      region: form.region.trim() || null,
      country: form.country.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
      start_date: form.start_date,
      end_date: form.end_date,
      all_day: form.all_day,
      start_time: form.all_day ? null : form.start_time,
      end_time: form.all_day ? null : form.end_time,
      recurrence: form.recurrence,
      recurrence_until: form.recurrence === "none" ? null : form.recurrence_until,
      is_free: form.is_free,
      cost_amount: form.is_free ? null : Number(form.cost_amount || 0),
      cost_currency: form.is_free ? null : "USD",
      age_min: form.age_min ? Number(form.age_min) : null,
      age_label: form.age_label.trim() || null,
      skill_level: form.skill_level,
      capacity: form.capacity ? Number(form.capacity) : null,
      info_url: form.info_url.trim() || null,
      image_url: form.image_url.trim() || null,
      tags: form.tags
        ? form.tags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12)
        : null,
      website: form.website,
    };

    const { data, error } = await supabase.functions.invoke("submit-event", {
      body: payload,
    });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (data?.error) {
      toast({
        title: "Submission failed",
        description: String(data.error),
        variant: "destructive",
      });
      return;
    }

    navigate("/submit/thanks", { state: { email: payload.submitter_email } });
  };

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-3xl">
        <p className="label-caps text-red">Submit an Event</p>
        <h1 className="mt-2 text-4xl text-navy md:text-5xl">Add to the calendar</h1>
        <p className="mt-3 text-muted-foreground">
          Free for the community. We'll email you a verification link, and once you
          confirm, your event publishes automatically and you'll get a private link
          to edit or cancel it any time.
        </p>

        <div className="mt-8 flex items-center gap-2 border border-hairline bg-white p-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 border-2 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                step === s
                  ? "border-red bg-red text-cream"
                  : step > s
                    ? "border-navy bg-navy text-cream"
                    : "border-hairline text-muted-foreground"
              }`}
            >
              {["Basics", "Where", "When", "Details"][s - 1]}
            </div>
          ))}
        </div>

        <div className="mt-8 border border-hairline bg-white p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Event title" required>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  maxLength={200}
                  placeholder="DMV Throwers Open Meet"
                />
              </Field>
              <Field label="Event type" required>
                <Select value={form.type} onValueChange={(v) => update("type", v as FormState["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meetup">Club / Meetup</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="contest">Contest</SelectItem>
                    <SelectItem value="fair">Fair / Convention</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Description" required hint="What is it? Who's it for? What to bring?">
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={5000}
                  rows={6}
                />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Organizer name" required>
                  <Input
                    value={form.organizer_name}
                    onChange={(e) => update("organizer_name", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Your email" required hint="Used for verification + admin contact. Not public.">
                  <Input
                    type="email"
                    value={form.submitter_email}
                    onChange={(e) => update("submitter_email", e.target.value)}
                    maxLength={255}
                  />
                </Field>
              </div>
              <Field label="Public contact" hint="Optional — shown on the event page (email, Discord, IG, etc.)">
                <Input
                  value={form.public_contact}
                  onChange={(e) => update("public_contact", e.target.value)}
                  maxLength={500}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Field label="Venue name" required>
                <Input
                  value={form.venue_name}
                  onChange={(e) => update("venue_name", e.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label="Street address" required>
                <Input
                  value={form.address}
                  onChange={(e) => {
                    update("address", e.target.value);
                    update("latitude", null);
                    update("longitude", null);
                  }}
                  maxLength={500}
                />
              </Field>
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="City"><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></Field>
                <Field label="State / Region"><Input value={form.region} onChange={(e) => update("region", e.target.value)} /></Field>
                <Field label="Country"><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></Field>
              </div>

              {(geoLoading || geoResults.length > 0) && (
                <div className="border border-hairline bg-cream-mid">
                  <p className="border-b border-hairline px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {geoLoading ? "Looking up location…" : "Pick the matching location"}
                  </p>
                  <ul>
                    {geoResults.map((g, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => pickGeo(g)}
                          className="block w-full border-b border-hairline px-4 py-2 text-left text-sm hover:bg-cream"
                        >
                          {g.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {form.latitude !== null && form.longitude !== null && (
                <p className="border-l-4 border-teal bg-cream-mid p-3 text-sm">
                  <span className="font-semibold">Pinned:</span>{" "}
                  {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Start date" required>
                  <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
                </Field>
                <Field label="End date" required hint="Same as start for a single-day event. Max 3 days.">
                  <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
                </Field>
              </div>
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={form.all_day}
                  onCheckedChange={(v) => update("all_day", Boolean(v))}
                />
                <span className="font-medium">All day</span>
              </label>
              {!form.all_day && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Start time" required>
                    <Input type="time" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} />
                  </Field>
                  <Field label="End time" required>
                    <Input type="time" value={form.end_time} onChange={(e) => update("end_time", e.target.value)} />
                  </Field>
                </div>
              )}

              <Field label="Recurrence">
                <Select value={form.recurrence} onValueChange={(v) => update("recurrence", v as FormState["recurrence"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.recurrence !== "none" && (
                <Field label="Recurs until" required hint="Max 1 year out. We'll email you to renew before it expires.">
                  <Input
                    type="date"
                    value={form.recurrence_until}
                    onChange={(e) => update("recurrence_until", e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <label className="flex items-center gap-3">
                <Checkbox checked={form.is_free} onCheckedChange={(v) => update("is_free", Boolean(v))} />
                <span className="font-medium">Free to attend</span>
              </label>
              {!form.is_free && (
                <Field label="Cost (USD)" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_amount}
                    onChange={(e) => update("cost_amount", e.target.value)}
                  />
                </Field>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Skill level">
                  <Select value={form.skill_level} onValueChange={(v) => update("skill_level", v as FormState["skill_level"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Min age" hint="Leave blank if any age">
                  <Input type="number" min="0" max="120" value={form.age_min} onChange={(e) => update("age_min", e.target.value)} />
                </Field>
              </div>
              <Field label="Age description" hint='e.g. "Teen friendly", "21+"'>
                <Input value={form.age_label} onChange={(e) => update("age_label", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Capacity" hint="Optional max attendee count">
                <Input type="number" min="1" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} />
              </Field>
              <Field label="Info / signup URL">
                <Input type="url" value={form.info_url} onChange={(e) => update("info_url", e.target.value)} />
              </Field>
              <Field label="Cover image URL" hint="Optional. Direct image link.">
                <Input type="url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} />
              </Field>
              <Field label="Tags" hint="Comma-separated. Up to 12.">
                <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="1a, freestyle, kids-welcome" />
              </Field>

              {/* Honeypot — visually hidden */}
              <div aria-hidden="true" className="absolute -left-[9999px]">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-hairline pt-6">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !stepOneValid) ||
                  (step === 2 && !stepTwoValid) ||
                  (step === 3 && !stepThreeValid)
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit for verification"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold uppercase tracking-wider text-navy">
      {label} {required && <span className="text-red">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default SubmitPage;
