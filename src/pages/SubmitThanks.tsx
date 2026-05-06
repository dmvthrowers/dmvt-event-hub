import { useLocation, Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const SubmitThanksPage = () => {
  const loc = useLocation();
  const email = (loc.state as { email?: string } | null)?.email;
  return (
    <SiteLayout>
      <section className="container-dmvt section-pad max-w-2xl">
        <Breadcrumbs
          items={[
            { label: "Submit", to: "/submit" },
            { label: "Thanks" },
          ]}
        />
        <div className="mt-6 text-center">
        <p className="label-caps text-red">Almost there</p>
        <h1 className="mt-2 text-4xl text-navy md:text-5xl">Check your inbox</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We sent a verification link
          {email ? <> to <span className="font-semibold text-navy">{email}</span></> : null}.
          Click it to publish your event. The link expires in 7 days.
        </p>
        <div className="mt-8 border-l-4 border-teal bg-cream-mid p-4 text-left text-sm">
          <strong>Heads up:</strong> while we finish wiring up our sender domain,
          verification links may take a moment, or an admin may need to forward
          them. If you don't see the email within a few minutes, reach out at{" "}
          <Link to="/about" className="text-red underline">the about page</Link>.
        </div>
        <div className="mt-8">
          <Link to="/events" className="border-2 border-navy bg-navy px-6 py-3 text-cream">
            Browse Events
          </Link>
        </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default SubmitThanksPage;
