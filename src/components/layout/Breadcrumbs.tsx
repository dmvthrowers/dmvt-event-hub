import { Link } from "react-router-dom";
import { ChevronRight, Home as HomeIcon } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  items: Crumb[];
  className?: string;
}

/**
 * Breadcrumb trail for utility/deep pages so users always have a clear
 * "back to where I came from" path. Last item is rendered as plain text.
 */
export const Breadcrumbs = ({ items, className }: Props) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`label-caps flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 hover:text-red"
      >
        <HomeIcon className="h-3 w-3" /> Home
      </Link>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 opacity-60" />
            {last || !c.to ? (
              <span className="text-navy">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-red">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
