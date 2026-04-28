import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Inbox,
  CalendarDays,
  Flag,
  Users,
  BarChart3,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useAdminGuard, signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/admin/dashboard", label: "Queue", icon: Inbox },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/submitters", label: "Submitters", icon: Users },
  { to: "/admin/stats", label: "Stats", icon: BarChart3 },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const auth = useAdminGuard();
  const navigate = useNavigate();

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-navy">
        <p className="label-caps">Loading…</p>
      </div>
    );
  }

  if (auth.status === "authenticated" && !auth.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream p-8 text-navy">
        <h1 className="font-display text-2xl font-black">Not Authorized</h1>
        <p className="text-sm text-muted-foreground">Your account does not have admin access.</p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate("/admin", { replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream text-navy">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-hairline bg-cream-mid md:flex">
        <Link to="/admin/dashboard" className="border-b border-hairline px-5 py-5">
          <div className="font-display text-xl font-black text-navy">
            DMVT <span className="text-red">Admin</span>
          </div>
        </Link>
        <nav className="flex-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "label-caps mb-1 flex items-center gap-3 px-3 py-2 text-navy transition-colors",
                  isActive ? "bg-navy text-cream" : "hover:bg-cream"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-hairline p-3">
          <Link
            to="/"
            className="mb-2 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-navy"
          >
            <ExternalLink className="h-3 w-3" /> View site
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await signOut();
              navigate("/admin", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-hairline bg-cream-mid px-4 py-3 md:hidden">
          <Link to="/admin/dashboard" className="font-display text-lg font-black">
            DMVT <span className="text-red">Admin</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/admin", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Mobile nav strip */}
        <nav className="flex gap-1 overflow-x-auto border-b border-hairline bg-cream-mid px-2 py-2 md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "label-caps whitespace-nowrap px-3 py-1.5 text-xs",
                  isActive ? "bg-navy text-cream" : "text-navy"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};
