import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SubscribeFeeds } from "@/components/events/SubscribeFeeds";

export const SubscribePage = () => {
  return (
    <SiteLayout>
      <section className="bg-navy text-cream">
        <div className="container-dmvt py-12 md:py-16">
          <Link
            to="/events"
            className="label-caps inline-flex items-center gap-1.5 text-cream/70 hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to events
          </Link>
          <p className="label-caps mt-4 text-red">Subscribe</p>
          <h1 className="mt-3 font-display text-4xl text-cream md:text-5xl">
            Sync events to your calendar
          </h1>
          <p className="mt-3 max-w-2xl text-cream/80">
            Pick the categories and locations you care about, then add the feed
            to Apple Calendar, Google Calendar, Outlook, or any RSS reader. New
            matching events appear automatically.
          </p>
        </div>
      </section>

      <section className="container-dmvt py-8 md:py-10">
        <SubscribeFeeds />
      </section>
    </SiteLayout>
  );
};

export default SubscribePage;
