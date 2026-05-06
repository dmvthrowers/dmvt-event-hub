import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ListChecks, Plus, ArrowUpRight, Rss } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";

const Home = () => {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative bg-navy text-cream">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(hsl(var(--cream))_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="container-dmvt relative section-pad text-center">
          <p className="label-caps text-red">Yo-Yos · Kendama · Skill Toys</p>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl leading-[1.05] md:text-7xl">
            Find Your People.
            <br />
            <span className="text-red">Throw Together.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/80 md:text-lg">
            A community calendar for yo-yo and skill toy events. Workshops,
            meetups, contests — anyone can add one. Browse on a list, map, or
            calendar, and subscribe in your favorite calendar app.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/events"
              className="label-caps inline-flex items-center gap-2 bg-red px-6 py-3 text-cream transition-colors hover:bg-red-dark"
            >
              Browse Events <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/subscribe"
              className="label-caps inline-flex items-center gap-2 border-2 border-cream px-6 py-3 text-cream hover:bg-cream hover:text-navy"
            >
              <Rss className="h-4 w-4" /> Subscribe
            </Link>
            <Link
              to="/submit"
              className="label-caps inline-flex items-center gap-2 text-cream/80 hover:text-cream"
            >
              Submit an Event <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Three view types */}
      <section className="bg-cream">
        <div className="container-dmvt section-pad">
          <div className="text-center">
            <p className="label-caps text-red">Three Ways to Browse</p>
            <h2 className="mt-3 text-3xl text-navy md:text-5xl">See It Your Way</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              The same events, three views. Pick the one that helps you find what's next.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ViewCard
              icon={<ListChecks className="h-8 w-8" />}
              title="List"
              description="Chronological, scannable, perfect for planning weekends."
              to="/events?view=list"
            />
            <ViewCard
              icon={<MapPin className="h-8 w-8" />}
              title="Map"
              description="See what's nearby. Cluster pins by region."
              to="/events?view=map"
            />
            <ViewCard
              icon={<CalendarDays className="h-8 w-8" />}
              title="Calendar"
              description="Month and week views. Color-coded by event type."
              to="/events?view=calendar"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream-mid">
        <div className="container-dmvt section-pad">
          <div className="text-center">
            <p className="label-caps text-red">Three Steps</p>
            <h2 className="mt-3 text-3xl text-navy md:text-5xl">How It Works</h2>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            <Step
              n={1}
              title="Submit Your Event"
              body="Fill out a short form. Workshop, meetup, or contest — single date, multi-day, or recurring up to a year."
            />
            <Step
              n={2}
              title="Verify Your Email"
              body="Click the link we send you. That confirms you're a real person and gives you a private link to manage the event later."
            />
            <Step
              n={3}
              title="It Goes Live"
              body="Your event appears on the list, map, and calendar instantly. Edit or cancel it any time from your manage link."
            />
          </div>
        </div>
      </section>

      {/* Stats / values strip */}
      <section className="bg-cream">
        <div className="container-dmvt section-pad">
          <div className="grid divide-y divide-hairline/60 border border-hairline/60 md:grid-cols-3 md:divide-x md:divide-y-0">
            <Stat big="Free" small="To submit, browse, attend" />
            <Stat big="3" small="Views — list, map, calendar" />
            <Stat big="100%" small="Community contributed" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-cream">
        <div className="container-dmvt section-pad text-center">
          <p className="label-caps text-red">Add To The Calendar</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl md:text-5xl">
            Hosting a meet, workshop, or contest?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/80">
            Get it in front of throwers in your area. Takes about a minute.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/submit"
              className="label-caps inline-flex items-center gap-2 bg-red px-6 py-3 text-cream hover:bg-red-dark"
            >
              <Plus className="h-4 w-4" /> Submit an Event
            </Link>
            <a
              href="https://map.dmvthrowers.club/"
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps inline-flex items-center gap-2 border-2 border-cream px-6 py-3 text-cream hover:bg-cream hover:text-navy"
            >
              Explore the YoYo Map <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

const ViewCard = ({
  icon,
  title,
  description,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}) => (
  <Link
    to={to}
    className="group flex flex-col gap-4 border border-hairline/70 bg-card p-8 transition-colors hover:border-red"
  >
    <div className="text-red">{icon}</div>
    <h3 className="text-2xl text-navy">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
    <span className="label-caps mt-auto inline-flex items-center gap-1 text-navy group-hover:text-red">
      Open <ArrowRight className="h-4 w-4" />
    </span>
  </Link>
);

const Step = ({ n, title, body }: { n: number; title: string; body: string }) => (
  <div className="text-center">
    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center border-2 border-red font-display text-2xl font-black text-red">
      {n}
    </div>
    <div className="mx-auto mt-4 h-px w-12 bg-hairline" />
    <h3 className="mt-4 text-2xl text-navy">{title}</h3>
    <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">{body}</p>
  </div>
);

const Stat = ({ big, small }: { big: string; small: string }) => (
  <div className="px-6 py-10 text-center">
    <p className="font-display text-5xl font-black text-red md:text-6xl">{big}</p>
    <p className="label-caps mt-3 text-navy">{small}</p>
  </div>
);

export default Home;
