import { SiteLayout } from "@/components/layout/SiteLayout";

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <SiteLayout>
    <section className="container-dmvt section-pad text-center">
      <p className="label-caps text-red">Coming Next</p>
      <h1 className="mt-4 text-4xl text-navy md:text-6xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{description}</p>
    </section>
  </SiteLayout>
);

export const EventsPage = () => (
  <Placeholder
    title="Events Explorer"
    description="List, map, and calendar views are being built next. Check back shortly."
  />
);

export const SubmitPage = () => (
  <Placeholder
    title="Submit an Event"
    description="The submission form (with email verification) is being built next."
  />
);

export const AboutPage = () => (
  <Placeholder
    title="About DMVT Events"
    description="A free, community-built calendar for yo-yo workshops, club meetups, and contests. More info coming soon."
  />
);
