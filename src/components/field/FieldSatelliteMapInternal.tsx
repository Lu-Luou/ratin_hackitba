"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";

type LatLngTuple = [number, number];

type FieldSatelliteMapInternalProps = {
  center: LatLngTuple | null;
  polygon: LatLngTuple[] | null;
};

function FitViewport({ center, polygon }: FieldSatelliteMapInternalProps) {
  const map = useMap();

  useEffect(() => {
    if (polygon && polygon.length > 0) {
      map.fitBounds(polygon, {
        padding: [24, 24],
      });
      return;
    }

    if (center) {
      map.setView(center, 14);
    }
  }, [map, center, polygon]);

  return null;
}

export function FieldSatelliteMapInternal({ center, polygon }: FieldSatelliteMapInternalProps) {
  const initialCenter: LatLngTuple = center ?? [-34.6037, -58.3816];
  const initialZoom = center ? 14 : 5;

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-md border sm:h-[420px]">
      <MapContainer center={initialCenter} zoom={initialZoom} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitViewport center={center} polygon={polygon} />
        {polygon ? <Polygon positions={polygon} pathOptions={{ color: "#2f6f4f", weight: 2 }} /> : null}
        {center ? <CircleMarker center={center} radius={5} pathOptions={{ color: "#f59e0b" }} /> : null}
      </MapContainer>
    </div>
  );
}