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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-navy focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to main content
      </a>
      <TopBar />
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
};
