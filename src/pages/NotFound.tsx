import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Not Found:", location.pathname);
  }, [location.pathname]);

  return (
    <SiteLayout>
      <section className="container-dmvt section-pad text-center">
        <p className="label-caps text-red">404</p>
        <h1 className="mt-4 font-display text-6xl font-black text-navy md:text-8xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          That route doesn't exist. Try heading back to the home page or browse events.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="label-caps inline-flex bg-red px-6 py-3 text-cream hover:bg-red-dark"
          >
            Home
          </Link>
          <Link
            to="/events"
            className="label-caps inline-flex border-2 border-navy px-6 py-3 text-navy hover:bg-navy hover:text-cream"
          >
            Browse Events
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
};

export default NotFound;
