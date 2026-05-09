"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Incident = {
  id: string;
  status: "Pending" | "Confirmed" | "Flagged";
  witness_count: number;
  first_seen_at: string;
  centroid_lat: number;
  centroid_lon: number;
};

type MapComponentProps = {
  incidents: Incident[];
  selected: Incident | null;
  onSelect: (inc: Incident | null) => void;
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapComponent({ incidents, selected, onSelect }: MapComponentProps) {
  const center: [number, number] = incidents.length > 0 
    ? [incidents[0].centroid_lat, incidents[0].centroid_lon] 
    : [12.9716, 77.5946];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
    >
      <ChangeView center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {incidents.map((inc) => (
        <Marker
          key={inc.id}
          position={[inc.centroid_lat, inc.centroid_lon]}
          eventHandlers={{
            click: () => onSelect(inc),
          }}
          icon={L.divIcon({
            className: "custom-div-icon",
            html: `<div style="
              width: ${inc.status === "Confirmed" ? "16px" : "11px"};
              height: ${inc.status === "Confirmed" ? "16px" : "11px"};
              border-radius: 50%;
              background: ${inc.status === "Confirmed" ? "#14f195" : inc.status === "Flagged" ? "#ff4d6d" : "#f5a623"};
              border: 2px solid rgba(255,255,255,0.85);
              box-shadow: 0 0 12px ${inc.status === "Confirmed" ? "#14f195" : inc.status === "Flagged" ? "#ff4d6d" : "#f5a623"};
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
        >
          {selected?.id === inc.id && (
            <Popup eventHandlers={{ remove: () => onSelect(null) }}>
              <div style={{ color: "#111827", minWidth: "160px" }}>
                <strong style={{ display: "block", marginBottom: "4px" }}>{inc.status} Incident</strong>
                <div style={{ fontSize: "0.85rem" }}>{inc.witness_count} witnesses reported</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
                  {new Date(inc.first_seen_at).toLocaleString()}
                </div>
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
