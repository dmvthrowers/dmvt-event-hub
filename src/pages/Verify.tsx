import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "ok" | "error";

export const VerifyPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-event", {
        body: { token },
      });
      if (error || data?.error) {
        setStatus("error");
        const code = data?.error || error?.message || "unknown";
        setMessage(
          code === "already_used"
            ? "This link has already been used. Your event is live!"
            : code === "expired"
              ? "This link has expired. Please resubmit your event."
              : code === "invalid_token"
                ? "We couldn't find that verification link."
                : `Something went wrong: ${code}`,
        );
        return;
      }
      setStatus("ok");
      if (data?.manage_url) setManageUrl(data.manage_url);
    })();
  }, [token]);

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-2xl text-center">
        {status === "loading" && (
          <>
            <p className="label-caps text-red">Verifying</p>
            <h1 className="mt-2 text-4xl text-navy md:text-5xl">One moment…</h1>
            <p className="mt-4 text-muted-foreground">Confirming your event.</p>
          </>
        )}
        {status === "ok" && (
          <>
            <p className="label-caps text-teal">Published</p>
            <h1 className="mt-2 text-4xl text-navy md:text-5xl">You're live!</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your event is now visible on the calendar, list, and map. We've
              also emailed you a private link to edit or cancel it any time.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/events" className="border-2 border-red bg-red px-6 py-3 text-cream">
                See it on the calendar
              </Link>
              {manageUrl && (
                <Link to={manageUrl.replace(/^.*\/manage/, "/manage")} className="border-2 border-navy px-6 py-3 text-navy">
                  Manage event
                </Link>
              )}
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <p className="label-caps text-red">Verification problem</p>
            <h1 className="mt-2 text-4xl text-navy md:text-5xl">Hmm.</h1>
            <p className="mt-4 text-lg text-muted-foreground">{message}</p>
            <div className="mt-8">
              <Link to="/submit" className="border-2 border-navy bg-navy px-6 py-3 text-cream">
                Resubmit
              </Link>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
};

export default VerifyPage;
