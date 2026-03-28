"use client";

import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMapEvents } from "react-leaflet";

export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type OrientedRectangleSelection = {
  pointA: LatLngPoint | null;
  pointB: LatLngPoint | null;
  pointC: LatLngPoint | null;
};

type FieldBoundingBoxMapInternalProps = {
  selection: OrientedRectangleSelection;
  onSelectionChange: (selection: OrientedRectangleSelection) => void;
  polygon: [number, number][] | null;
  pointA: LatLngPoint | null;
  pointB: LatLngPoint | null;
  pointC: LatLngPoint | null;
};

function ClickHandler({
  selection,
  onSelectionChange,
}: Pick<FieldBoundingBoxMapInternalProps, "selection" | "onSelectionChange">) {
  useMapEvents({
    click(event) {
      const nextPoint = {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      };

      console.log("[MAP_CLICK] New point clicked:", nextPoint);

      const { pointA, pointB, pointC } = selection;

      if (!pointA || pointC) {
        console.log("[MAP_CLICK] Setting pointA (resetting selection)");
        onSelectionChange({ pointA: nextPoint, pointB: null, pointC: null });
        return;
      }

      if (!pointB) {
        console.log("[MAP_CLICK] Setting pointB");
        onSelectionChange({ pointA, pointB: nextPoint, pointC: null });
        return;
      }

      console.log("[MAP_CLICK] Setting pointC (completing rectangle)");
      onSelectionChange({ pointA, pointB, pointC: nextPoint });
    },
  });

  return null;
}

export function FieldBoundingBoxMapInternal({
  selection,
  onSelectionChange,
  polygon,
  pointA,
  pointB,
  pointC,
}: FieldBoundingBoxMapInternalProps) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-md border sm:h-[420px]">
      <MapContainer center={[-34.6037, -58.3816]} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ClickHandler selection={selection} onSelectionChange={onSelectionChange} />
        {pointA ? <CircleMarker center={[pointA.lat, pointA.lng]} radius={5} pathOptions={{ color: "#2f6f4f" }} /> : null}
        {pointB ? <CircleMarker center={[pointB.lat, pointB.lng]} radius={5} pathOptions={{ color: "#2f6f4f" }} /> : null}
        {pointC ? <CircleMarker center={[pointC.lat, pointC.lng]} radius={5} pathOptions={{ color: "#2f6f4f" }} /> : null}
        {pointA && pointB ? <Polyline positions={[[pointA.lat, pointA.lng], [pointB.lat, pointB.lng]]} pathOptions={{ color: "#2f6f4f", weight: 2 }} /> : null}
        {polygon ? <Polygon positions={polygon} pathOptions={{ color: "#2f6f4f", weight: 2 }} /> : null}
      </MapContainer>
    </div>
  );
}
