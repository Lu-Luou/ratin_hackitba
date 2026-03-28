"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { FieldBoundingBoxMapInternal, LatLngPoint, OrientedRectangleSelection } from "./FieldBoundingBoxMapInternal";

// Dynamically import the internal map component to avoid "window is not defined" at build time
const MapComponent = dynamic(() => import("./FieldBoundingBoxMapInternal").then(m => ({ default: m.FieldBoundingBoxMapInternal })), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full flex items-center justify-center rounded-md border bg-gray-100 sm:h-[420px]">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export type { LatLngPoint, OrientedRectangleSelection };

type FieldBoundingBoxMapProps = {
  selection: OrientedRectangleSelection;
  onSelectionChange: (selection: OrientedRectangleSelection) => void;
};

const KM_PER_LAT_DEGREE = 111.32;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getKmPerLongitudeDegree(referenceLat: number) {
  return Math.max(KM_PER_LAT_DEGREE * Math.cos(toRadians(referenceLat)), 1e-6);
}

function toPlanar(point: LatLngPoint, origin: LatLngPoint, referenceLat: number) {
  const kmPerLongitude = getKmPerLongitudeDegree(referenceLat);
  return {
    x: (point.lng - origin.lng) * kmPerLongitude,
    y: (point.lat - origin.lat) * KM_PER_LAT_DEGREE,
  };
}

function toLatLng(vector: { x: number; y: number }, origin: LatLngPoint, referenceLat: number): LatLngPoint {
  const kmPerLongitude = getKmPerLongitudeDegree(referenceLat);
  return {
    lat: origin.lat + vector.y / KM_PER_LAT_DEGREE,
    lng: origin.lng + vector.x / kmPerLongitude,
  };
}

export function buildOrientedRectangleCorners(selection: OrientedRectangleSelection): LatLngPoint[] | null {
  const { pointA, pointB, pointC } = selection;

  if (!pointA || !pointB || !pointC) {
    return null;
  }

  const referenceLat = (pointA.lat + pointB.lat + pointC.lat) / 3;
  const edge = toPlanar(pointB, pointA, referenceLat);
  const widthProbe = toPlanar(pointC, pointA, referenceLat);
  const edgeLength = Math.hypot(edge.x, edge.y);

  if (edgeLength < 1e-6) {
    return null;
  }

  const edgeUnit = {
    x: edge.x / edgeLength,
    y: edge.y / edgeLength,
  };
  const normalUnit = {
    x: -edgeUnit.y,
    y: edgeUnit.x,
  };
  const signedWidth = widthProbe.x * normalUnit.x + widthProbe.y * normalUnit.y;

  if (Math.abs(signedWidth) < 1e-6) {
    return null;
  }

  const pointAPlanar = { x: 0, y: 0 };
  const pointBPlanar = edge;
  const pointCPlanar = {
    x: edge.x + normalUnit.x * signedWidth,
    y: edge.y + normalUnit.y * signedWidth,
  };
  const pointDPlanar = {
    x: normalUnit.x * signedWidth,
    y: normalUnit.y * signedWidth,
  };

  return [
    toLatLng(pointAPlanar, pointA, referenceLat),
    toLatLng(pointBPlanar, pointA, referenceLat),
    toLatLng(pointCPlanar, pointA, referenceLat),
    toLatLng(pointDPlanar, pointA, referenceLat),
  ];
}

export function FieldBoundingBoxMap({ selection, onSelectionChange }: FieldBoundingBoxMapProps) {
  const corners = useMemo(() => {
    const result = buildOrientedRectangleCorners(selection);
    if (result) {
      console.log("[MAP] Calculated corners from selection:", {
        pointA: selection.pointA,
        pointB: selection.pointB,
        pointC: selection.pointC,
        corners: result,
      });
    }
    return result;
  }, [selection]);

  const polygon = useMemo(() => corners?.map((point) => [point.lat, point.lng] as [number, number]) ?? null, [corners]);
  const pointA = selection.pointA;
  const pointB = selection.pointB;
  const pointC = selection.pointC;

  console.log("[MAP] Rendering with selection:", { pointA, pointB, pointC, cornersCount: corners?.length ?? 0 });

  return (
    <MapComponent
      selection={selection}
      onSelectionChange={onSelectionChange}
      polygon={polygon}
      pointA={pointA}
      pointB={pointB}
      pointC={pointC}
    />
  );
}