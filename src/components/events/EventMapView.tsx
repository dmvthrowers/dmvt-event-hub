import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import {
  type OccurrenceWithEvent,
  EVENT_TYPE_LABEL,
  formatLocation,
  formatOccurrenceWhen,
  typeColor,
} from "@/lib/events";

interface Props {
  rows: OccurrenceWithEvent[];
}

// Fix default Leaflet icon paths under bundlers
const FALLBACK_ICON_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const FALLBACK_ICON_SHADOW =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

function makePinIcon(color: string): L.DivIcon {
  const html = `
    <span style="
      display:inline-block;
      width:18px;height:18px;border-radius:50%;
      background:${color};
      border:2px solid #fffdfa;
      box-shadow:0 0 0 1px rgba(16,32,64,0.5);
    "></span>`;
  return L.divIcon({
    html,
    className: "dmvt-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export const EventMapView = ({ rows }: Props) => {
  // Configure default icon once (fallback for any non-divIcon usage)
  useEffect(() => {
    // @ts-expect-error -- delete private prop
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: FALLBACK_ICON_URL,
      iconUrl: FALLBACK_ICON_URL,
      shadowUrl: FALLBACK_ICON_SHADOW,
    });
  }, []);

  // Group occurrences by event so each location renders one pin
  const pins = useMemo(() => {
    const byEvent = new Map<string, { row: OccurrenceWithEvent; count: number; next: OccurrenceWithEvent }>();
    for (const r of rows) {
      if (r.event.latitude == null || r.event.longitude == null) continue;
      const existing = byEvent.get(r.event.id);
      if (!existing) byEvent.set(r.event.id, { row: r, count: 1, next: r });
      else {
        existing.count += 1;
        if (new Date(r.start_at) < new Date(existing.next.start_at)) existing.next = r;
      }
    }
    return Array.from(byEvent.values());
  }, [rows]);

  // Default center: DMV region
  const center: [number, number] = pins.length
    ? [pins[0].row.event.latitude!, pins[0].row.event.longitude!]
    : [38.9, -77.03];

  return (
    <div className="h-[600px] border border-hairline">
      <MapContainer
        center={center}
        zoom={pins.length ? 7 : 5}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map(({ row, count, next }) => (
          <Marker
            key={row.event.id}
            position={[row.event.latitude!, row.event.longitude!]}
            icon={makePinIcon(typeColor(row.event.type))}
          >
            <Popup>
              <div className="space-y-1">
                <p className="label-caps text-red">{EVENT_TYPE_LABEL[row.event.type]}</p>
                <p className="font-display text-base text-navy">{row.event.title}</p>
                <p className="text-xs text-muted-foreground">{formatOccurrenceWhen(next)}</p>
                <p className="text-xs text-muted-foreground">{formatLocation(row.event)}</p>
                {count > 1 && (
                  <p className="text-xs text-muted-foreground">+{count - 1} more dates</p>
                )}
                <Link
                  to={`/events/${row.event.slug}`}
                  className="label-caps mt-1 inline-block text-red underline"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {pins.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No mapped events match your filters yet.
        </p>
      )}
    </div>
  );
};
