import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Calendar, MapPin, Plus } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/seo/Seo";

export const AboutPage = () => {
  return (
    <SiteLayout>
      <Seo
        title="About YoYo Events — A Calendar Built by Throwers"
        description="YoYo Events is a free, open community calendar for yo-yo, kendama, and skill toy events. No accounts, no ads — just a shared place to find what's happening."
        path="/about"
      />
      {/* Hero */}
      <section className="relative bg-navy text-cream">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(hsl(var(--cream))_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="container-dmvt relative section-pad text-center">
          <p className="label-caps text-red">About YoYo Events</p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] md:text-6xl">
            A Calendar Built By <span className="text-red">Throwers</span>, For Throwers.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-cream/80 md:text-lg">
            YoYo Events is a free, open community calendar for yo-yo, kendama,
            and skill toy events worldwide. No accounts, no ads, no gatekeepers
            — just a shared place to find what's happening and tell people about
            your own meetup.
          </p>
        </div>
      </section>

      {/* Values strip */}
      <section className="bg-cream">
        <div className="container-dmvt section-pad">
          <div className="grid divide-y divide-hairline/60 border border-hairline/60 md:grid-cols-3 md:divide-x md:divide-y-0">
            <Stat big="Free" small="To submit, browse, subscribe" />
            <Stat big="Open" small="Anyone can post an event" />
            <Stat big="Yours" small="Edit or delete any time" />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="bg-cream-mid">
        <div className="container-dmvt section-pad grid gap-12 md:grid-cols-2 md:items-start">
          <div>
            <p className="label-caps text-red">Why this exists</p>
            <h2 className="mt-3 font-display text-3xl text-navy md:text-5xl">
              Skill toy meetups are everywhere — and impossible to find.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Events live on Instagram stories, Discord servers, group chats,
              and the occasional Facebook page. By the time you hear about a
              meet, it already happened. We wanted one place that worked the way
              a calendar should: open, subscribable, and built by the same
              people who go.
            </p>
          </div>
          <div className="border border-hairline/70 bg-cream p-6 md:p-8">
            <p className="label-caps text-red">What goes here</p>
            <ul className="mt-4 space-y-3 text-sm text-navy/90">
              <li className="flex gap-3">
                <span className="text-red">→</span>
                Club meetups — recurring or one-off
              </li>
              <li className="flex gap-3">
                <span className="text-red">→</span>
                Workshops, jams, and skill shares
              </li>
              <li className="flex gap-3">
                <span className="text-red">→</span>
                Contests, exhibitions, and parties
              </li>
              <li className="flex gap-3">
                <span className="text-red">→</span>
                Yo-yo, kendama, diabolo, juggling, all skill toys
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* What we don't do — mirrors the map's privacy section */}
      <section className="bg-cream">
        <div className="container-dmvt section-pad">
          <div className="text-center">
            <p className="label-caps text-red">Privacy First</p>
            <h2 className="mt-3 font-display text-3xl text-navy md:text-5xl">
              What We Don't Do
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-3 md:grid-cols-2">
            {[
              "We don't require an account to browse or submit.",
              "We don't sell, share, or rent your data to anyone.",
              "We don't run advertising trackers or analytics cookies.",
              "We don't expose submitter emails on the public site.",
              "We don't allow direct messaging through the site.",
              "We don't keep your event if you ask us to delete it.",
            ].map((line) => (
              <div
                key={line}
                className="flex items-start gap-3 border border-hairline/60 bg-cream-mid p-4 text-sm text-navy/90"
              >
                <span className="mt-0.5 text-red">✕</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who's behind this */}
      <section className="bg-cream-mid">
        <div className="container-dmvt section-pad">
          <div className="text-center">
            <p className="label-caps text-red">Who's behind this</p>
            <h2 className="mt-3 font-display text-3xl text-navy md:text-5xl">
              Built by DMV Throwers
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
              YoYo Events and the{" "}
              <a
                href="https://map.dmvthrowers.club/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline-offset-4 hover:text-red hover:underline"
              >
                YoYo Map
              </a>{" "}
              are independent community tools maintained by{" "}
              <a
                href="https://dmvthrowers.club/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline-offset-4 hover:text-red hover:underline"
              >
                DMV Throwers
              </a>
              , a free yo-yo and skill toy club in the Washington DC, Maryland,
              and Virginia area. They're free to use anywhere — and we'd love
              to see them grow into the foundation for a Mid-Atlantic, and
              eventually national, network of skill toy clubs.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
            <EcoCard
              icon={<MapPin className="h-5 w-5" />}
              title="YoYo Map"
              body="Find throwers near you. Opt-in, location-blurred, family-friendly."
              href="https://map.dmvthrowers.club/"
              external
            />
            <EcoCard
              icon={<Calendar className="h-5 w-5" />}
              title="DMV Throwers"
              body="The home club: monthly meetups in Arlington, VSYC contest, and more."
              href="https://dmvthrowers.club/"
              external
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-cream">
        <div className="container-dmvt section-pad text-center">
          <p className="label-caps text-red">Ready?</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl md:text-5xl">
            Add your meetup to the calendar.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/80">
            Free, all skill levels, family-friendly. Takes about a minute.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/submit"
              className="label-caps inline-flex items-center gap-2 bg-red px-6 py-3 text-cream hover:bg-red-dark"
            >
              <Plus className="h-4 w-4" /> Submit an Event
            </Link>
            <Link
              to="/events"
              className="label-caps inline-flex items-center gap-2 border-2 border-cream px-6 py-3 text-cream hover:bg-cream hover:text-navy"
            >
              Browse Events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

const Stat = ({ big, small }: { big: string; small: string }) => (
  <div className="px-6 py-10 text-center">
    <p className="font-display text-5xl font-black text-red md:text-6xl">
      {big}
    </p>
    <p className="label-caps mt-3 text-navy">{small}</p>
  </div>
);

const EcoCard = ({
  icon,
  title,
  body,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  external?: boolean;
}) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className="group flex flex-col gap-3 border border-hairline/70 bg-cream p-6 transition-colors hover:border-red"
  >
    <div className="flex items-center justify-between">
      <span className="text-red">{icon}</span>
      {external && (
        <ArrowUpRight className="h-4 w-4 text-navy/40 group-hover:text-red" />
      )}
    </div>
    <h3 className="font-display text-xl text-navy">{title}</h3>
    <p className="text-sm text-muted-foreground">{body}</p>
  </a>
);
