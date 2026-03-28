"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const MapComponent = dynamic(
  () => import("./FieldSatelliteMapInternal").then((module) => ({ default: module.FieldSatelliteMapInternal })),
  {
    ssr: false,
    loading: () => <div className="h-[320px] w-full animate-pulse rounded-md border bg-muted sm:h-[420px]" />,
  },
);

type LatLngTuple = [number, number];

type FieldSatelliteMapProps = {
  latitude: number | null;
  longitude: number | null;
  bboxMinLon: number | null;
  bboxMinLat: number | null;
  bboxMaxLon: number | null;
  bboxMaxLat: number | null;
};

function hasValidNumber(value: number | null) {
  return value !== null && Number.isFinite(value);
}

export function FieldSatelliteMap({ latitude, longitude, bboxMinLon, bboxMinLat, bboxMaxLon, bboxMaxLat }: FieldSatelliteMapProps) {
  const hasBbox =
    hasValidNumber(bboxMinLon) &&
    hasValidNumber(bboxMinLat) &&
    hasValidNumber(bboxMaxLon) &&
    hasValidNumber(bboxMaxLat);

  const polygon = useMemo<LatLngTuple[] | null>(() => {
    if (!hasBbox) {
      return null;
    }

    const minLon = bboxMinLon as number;
    const minLat = bboxMinLat as number;
    const maxLon = bboxMaxLon as number;
    const maxLat = bboxMaxLat as number;

    return [
      [minLat, minLon],
      [minLat, maxLon],
      [maxLat, maxLon],
      [maxLat, minLon],
    ];
  }, [hasBbox, bboxMinLon, bboxMinLat, bboxMaxLon, bboxMaxLat]);

  const center = useMemo<LatLngTuple | null>(() => {
    if (hasValidNumber(latitude) && hasValidNumber(longitude)) {
      return [latitude as number, longitude as number];
    }

    if (hasBbox) {
      return [
        ((bboxMinLat as number) + (bboxMaxLat as number)) / 2,
        ((bboxMinLon as number) + (bboxMaxLon as number)) / 2,
      ];
    }

    return null;
  }, [latitude, longitude, hasBbox, bboxMinLon, bboxMinLat, bboxMaxLon, bboxMaxLat]);

  if (!center && !polygon) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        Este campo no tiene coordenadas ni bbox definidos para mostrar la imagen satelital.
      </div>
    );
  }

  return <MapComponent center={center} polygon={polygon} />;
}