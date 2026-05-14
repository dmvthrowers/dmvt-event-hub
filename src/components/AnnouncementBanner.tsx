import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  message: string;
  // ISO 8601 string. Banner auto-hides once this time has passed.
  expiresAt: string;
}

// Dismissible announcement strip. Mirrors ApiBanner in the map app.
// Usage: <AnnouncementBanner message="..." expiresAt="2026-06-01T00:00:00Z" />
// When there's nothing to announce, simply don't render this component.
export function AnnouncementBanner({ message, expiresAt }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (new Date() < new Date(expiresAt)) {
      setVisible(true);
    }
  }, [expiresAt]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 bg-red px-4 py-2.5 text-cream"
    >
      <p className="label-caps mx-auto text-center text-xs">{message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
