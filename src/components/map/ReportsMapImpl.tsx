import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import { STATUS_COLORS, isStatus, type Report } from "@/lib/reports";

function icon(status: string) {
  const color = STATUS_COLORS[isStatus(status) ? status : "Reported"];
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 18],
    popupAnchor: [0, -16],
  });
}

export default function ReportsMapImpl({ reports }: { reports: Report[] }) {
  const first = reports[0];
  const center: [number, number] = first
    ? [first.latitude, first.longitude]
    : [20.5937, 78.9629];

  return (
    <MapContainer
      center={center}
      zoom={first ? 13 : 5}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reports.map((r) => (
        <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon(r.status)}>
          <Popup>
            <div className="w-44 space-y-2">
              <img
                src={r.photo_url}
                alt={r.category}
                className="h-24 w-full rounded-md object-cover"
              />
              <div className="text-sm font-semibold text-foreground">{r.category}</div>
              <div className="text-xs text-muted-foreground">{r.status}</div>
              <Link
                to="/report/$id"
                params={{ id: r.id }}
                className="inline-block text-xs font-semibold text-primary underline"
              >
                View Details
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
