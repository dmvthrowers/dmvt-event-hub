import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

interface SiteLayoutProps {
  children: ReactNode;
}

export const SiteLayout = ({ children }: SiteLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <TopBar />
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
};
