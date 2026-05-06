import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type State =
  | { status: "loading" }
  | { status: "success"; slug: string; title: string; expiresAt: string }
  | { status: "error"; message: string };

export const RenewEventPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Missing renewal token." });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("renew-event", {
        body: { token },
      });
      if (cancelled) return;
      if (error || !data?.ok) {
        const msg =
          (data as { error?: string } | null)?.error === "already_used"
            ? "This renewal link has already been used."
            : (data as { error?: string } | null)?.error === "expired"
              ? "This renewal link has expired."
              : "We couldn't process this renewal link.";
        setState({ status: "error", message: msg });
        return;
      }
      setState({
        status: "success",
        slug: data.slug,
        title: data.title,
        expiresAt: data.expires_at,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-xl">
        <Breadcrumbs items={[{ label: "Renew event" }]} />
        <div className="mt-6 text-center">
        {state.status === "loading" && (
          <div className="py-16">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-red" />
            <p className="mt-4 text-muted-foreground">Renewing your event…</p>
          </div>
        )}

        {state.status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-red" />
            <p className="label-caps mt-4 text-red">Renewed</p>
            <h1 className="mt-2 font-display text-3xl text-navy">{state.title}</h1>
            <p className="mt-3 text-muted-foreground">
              Your event is good until{" "}
              <strong className="text-navy">
                {new Date(state.expiresAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
              .
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link to={`/events/${state.slug}`}>View event</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/events">All events</Link>
              </Button>
            </div>
          </>
        )}

        {state.status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red" />
            <p className="label-caps mt-4 text-red">Couldn't renew</p>
            <h1 className="mt-2 font-display text-3xl text-navy">{state.message}</h1>
            <p className="mt-3 text-muted-foreground">
              If you still want to keep your event listed, you can resubmit it.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link to="/submit">Submit again</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/events">Browse events</Link>
              </Button>
            </div>
          </>
        )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default RenewEventPage;
