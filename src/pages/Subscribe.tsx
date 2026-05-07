import { SiteLayout } from "@/components/layout/SiteLayout";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SubscribeFeeds } from "@/components/events/SubscribeFeeds";
import { Seo } from "@/components/seo/Seo";

export const SubscribePage = () => {
  return (
    <SiteLayout>
      <Seo
        title="Subscribe to the Yo-Yo Events Calendar (iCal & RSS)"
        description="Sync yo-yo and skill toy events to Apple Calendar, Google Calendar, Outlook, or any RSS reader. Pick the categories and locations you care about."
        path="/subscribe"
      />
      <section className="bg-navy text-cream">
        <div className="container-dmvt py-12 md:py-16">
          <Breadcrumbs
            items={[
              { label: "Events", to: "/events" },
              { label: "Subscribe" },
            ]}
            className="!text-cream/70 [&_a]:!text-cream/70 [&_a:hover]:!text-cream [&_span.text-navy]:!text-cream"
          />
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

