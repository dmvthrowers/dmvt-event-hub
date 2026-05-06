import { Link, NavLink as RRNavLink } from "react-router-dom";
import { Menu, X, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/events", label: "Events" },
  { to: "/subscribe", label: "Subscribe" },
  { to: "/about", label: "About" },
];

export const SiteNav = () => {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 border-b border-hairline/60 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80"
    >
      <div className="container-dmvt flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="font-display text-xl font-black text-navy md:text-2xl">
            YoYo <span className="text-red">Events</span>
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
                  "label-caps relative text-navy transition-colors hover:text-red",
                  isActive &&
                    "text-red after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:bg-red"
                )
              }
            >
              {item.label}
            </RRNavLink>
          ))}
          <Link
            to="/submit"
            className="label-caps inline-flex items-center gap-1 bg-red px-4 py-2 text-cream hover:bg-red-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Submit
          </Link>
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
          className="p-2 text-navy md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open ? "true" : "false"}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-nav"
          className="border-t border-hairline/60 bg-cream md:hidden"
        >
          <div className="container-dmvt flex flex-col gap-2 py-4">
            <Link
              to="/submit"
              onClick={() => setOpen(false)}
              className="label-caps inline-flex items-center justify-center gap-1.5 bg-red px-4 py-3 text-cream hover:bg-red-dark"
            >
              <Plus className="h-4 w-4" /> Submit an event
            </Link>
            <div className="mt-2 flex flex-col">
              {navItems.map((item) => (
                <RRNavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "label-caps border-l-4 px-3 py-3 text-navy transition-colors",
                      isActive
                        ? "border-red bg-cream-mid text-red"
                        : "border-transparent hover:bg-cream-mid"
                    )
                  }
                >
                  {item.label}
                </RRNavLink>
              ))}
              <RRNavLink
                to="/feeds/manage"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "label-caps border-l-4 px-3 py-3 text-navy transition-colors",
                    isActive
                      ? "border-red bg-cream-mid text-red"
                      : "border-transparent hover:bg-cream-mid"
                  )
                }
              >
                Manage subscriptions
              </RRNavLink>
            </div>
            <a
              href="https://ko-fi.com/dmvthrowers"
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps mt-2 inline-flex items-center justify-center gap-1 bg-teal px-4 py-3 text-cream"
            >
              ☕ Donate
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};
