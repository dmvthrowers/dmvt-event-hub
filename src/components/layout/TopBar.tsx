import { ArrowUpRight } from "lucide-react";

/**
 * Red top strip — links back to the DMV Throwers ecosystem.
 * Mirrors the strip on dmvthrowers.club and yoyo-player-map.
 */
export const TopBar = () => {
  return (
    <div className="bg-red text-cream">
      <div className="container-dmvt flex h-9 items-center justify-between gap-4 text-[11px] md:text-xs">
        <a
          href="https://dmvthrowers.club/"
          target="_blank"
          rel="noopener noreferrer"
          className="label-caps inline-flex items-center gap-1 hover:underline"
        >
          DMV Throwers <ArrowUpRight className="h-3 w-3" />
        </a>
        <div className="flex items-center gap-4">
          <a
            href="https://map.dmvthrowers.club/"
            target="_blank"
            rel="noopener noreferrer"
            className="label-caps inline-flex items-center gap-1 hover:underline"
          >
            YoYo Map <ArrowUpRight className="h-3 w-3" />
          </a>
          <span className="hidden md:inline label-caps opacity-80">
            Free · Community Built
          </span>
        </div>
      </div>
    </div>
  );
};
