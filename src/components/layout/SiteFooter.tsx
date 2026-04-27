import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-hairline/60 bg-navy text-cream">
      <div className="container-dmvt grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-3xl font-black">
            DMVT <span className="text-red">Events</span>
          </p>
          <p className="mt-3 max-w-md text-sm text-cream/80">
            A free, community-built calendar for yo-yo workshops, club meetups,
            and contests. Anyone can submit an event. Find your crew, throw together.
          </p>
          <p className="mt-4 text-xs text-cream/60">
            Part of the DMV Throwers ecosystem · Est. 2021 · DC / MD / VA
          </p>
        </div>

        <div>
          <p className="label-caps text-cream/60">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/events" className="hover:text-red">Browse events</Link></li>
            <li><Link to="/submit" className="hover:text-red">Submit an event</Link></li>
            <li><Link to="/about" className="hover:text-red">About this calendar</Link></li>
          </ul>
        </div>

        <div>
          <p className="label-caps text-cream/60">Ecosystem</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="https://dmvthrowers.club/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-red"
              >
                DMV Throwers <ArrowUpRight className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://map.dmvthrowers.club/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-red"
              >
                YoYo Map <ArrowUpRight className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://ko-fi.com/dmvthrowers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-teal"
              >
                ☕ Donate
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-dmvt flex flex-col gap-2 py-5 text-xs text-cream/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} DMV Throwers · All ages, all levels, always free.</p>
          <p>contact@dmvthrowers.club · @dmv_throwers</p>
        </div>
      </div>
    </footer>
  );
};
