import { Link, NavLink as RRNavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/events", label: "Events" },
  { to: "/submit", label: "Submit" },
  { to: "/about", label: "About" },
];

export const SiteNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 border-b border-hairline/60 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="container-dmvt flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="font-display text-xl font-black text-navy md:text-2xl">
            DMVT <span className="text-red">Events</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <RRNavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "label-caps text-navy transition-colors hover:text-red",
                  isActive && "text-red"
                )
              }
            >
              {item.label}
            </RRNavLink>
          ))}
          <a
            href="https://ko-fi.com/dmvthrowers"
            target="_blank"
            rel="noopener noreferrer"
            className="label-caps inline-flex items-center gap-1 bg-teal px-4 py-2 text-cream hover:bg-teal/90"
          >
            ☕ Donate
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-navy"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-hairline/60 bg-cream md:hidden">
          <div className="container-dmvt flex flex-col gap-4 py-4">
            {navItems.map((item) => (
              <RRNavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "label-caps py-2 text-navy",
                    isActive && "text-red"
                  )
                }
              >
                {item.label}
              </RRNavLink>
            ))}
            <a
              href="https://ko-fi.com/dmvthrowers"
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps inline-flex items-center justify-center gap-1 bg-teal px-4 py-2 text-cream"
            >
              ☕ Donate
            </a>
            <span className="text-xs text-muted-foreground">{location.pathname}</span>
          </div>
        </div>
      )}
    </nav>
  );
};
