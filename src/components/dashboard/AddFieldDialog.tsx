"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useFields } from "@/context/FieldsContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildOrientedRectangleCorners,
  type LatLngPoint,
  type OrientedRectangleSelection,
} from "@/components/dashboard/FieldBoundingBoxMap";

const FieldBoundingBoxMap = dynamic(
  () => import("@/components/dashboard/FieldBoundingBoxMap").then((module) => module.FieldBoundingBoxMap),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-md border bg-muted" />,
  },
);

const KM_PER_LAT_DEGREE = 111.32;

function formatPoint(point: LatLngPoint) {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

function areaHectaresFromCorners(corners: LatLngPoint[]) {
  if (corners.length !== 4) {
    return null;
  }

  const referenceLat = corners.reduce((sum, point) => sum + point.lat, 0) / corners.length;
  const kmPerLongitude = Math.max(KM_PER_LAT_DEGREE * Math.cos((referenceLat * Math.PI) / 180), 1e-6);
  const edgeABKm = Math.hypot(
    (corners[1].lng - corners[0].lng) * kmPerLongitude,
    (corners[1].lat - corners[0].lat) * KM_PER_LAT_DEGREE,
  );
  const edgeADKm = Math.hypot(
    (corners[3].lng - corners[0].lng) * kmPerLongitude,
    (corners[3].lat - corners[0].lat) * KM_PER_LAT_DEGREE,
  );

  return Math.round(edgeABKm * edgeADKm * 100);
}

function centroidFromCorners(corners: LatLngPoint[]) {
  const count = corners.length;
  if (count === 0) {
    return null;
  }

  const lat = corners.reduce((sum, point) => sum + point.lat, 0) / count;
  const lng = corners.reduce((sum, point) => sum + point.lng, 0) / count;
  return { lat, lng };
}

export function AddFieldDialog() {
  const { addField } = useFields();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [zone, setZone] = useState("");
  const [selection, setSelection] = useState<OrientedRectangleSelection>({
    pointA: null,
    pointB: null,
    pointC: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultCostPerHaUsd, setDefaultCostPerHaUsd] = useState("0");

  const corners = useMemo(() => buildOrientedRectangleCorners(selection), [selection]);

  const computedHectares = useMemo(() => {
    if (!corners) {
      return null;
    }

    return areaHectaresFromCorners(corners);
  }, [corners]);

  const centerPoint = useMemo(() => {
    if (!corners) {
      return null;
    }

    return centroidFromCorners(corners);
  }, [corners]);

  const mapLocationLabel = useMemo(() => {
    if (!corners) {
      return undefined;
    }

    return `Rect: ${corners.map((point) => `(${formatPoint(point)})`).join(" -> ")}`;
  }, [corners]);

  const bboxBounds = useMemo(() => {
    if (!corners) {
      return null;
    }

    const lats = corners.map((point) => point.lat);
    const lngs = corners.map((point) => point.lng);

    return {
      bboxMinLon: Math.min(...lngs),
      bboxMinLat: Math.min(...lats),
      bboxMaxLon: Math.max(...lngs),
      bboxMaxLat: Math.max(...lats),
    };
  }, [corners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Completa el nombre del campo.");
      return;
    }

    if (!computedHectares || computedHectares <= 0) {
      setError("Selecciona 3 puntos en el mapa para definir un rectangulo orientado.");
      return;
    }

    if (computedHectares > 100_000) {
      setError("La superficie estimada supera el limite permitido (100.000 ha).");
      return;
    }

    const parsedCost = Number(defaultCostPerHaUsd);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError("El costo por ha debe ser un numero mayor o igual a 0.");
      return;
    }

    if (!bboxBounds) {
      setError("No se pudo construir el bbox del campo seleccionado.");
      return;
    }

    console.log("[ADD_FIELD] Submitting field with data:", {
      name: name.trim(),
      hectares: computedHectares,
      location: location.trim() || mapLocationLabel,
      zone: zone.trim() || undefined,
      latitude: centerPoint?.lat ?? null,
      longitude: centerPoint?.lng ?? null,
      bboxBounds,
      defaultCostPerHaUsd: parsedCost,
    });

    setError(null);
    setIsSubmitting(true);

    try {
      await addField({
        name: name.trim(),
        hectares: computedHectares,
        location: location.trim() || mapLocationLabel,
        zone: zone.trim() || undefined,
        latitude: centerPoint?.lat ?? null,
        longitude: centerPoint?.lng ?? null,
        bboxMinLon: bboxBounds.bboxMinLon,
        bboxMinLat: bboxBounds.bboxMinLat,
        bboxMaxLon: bboxBounds.bboxMaxLon,
        bboxMaxLat: bboxBounds.bboxMaxLat,
        defaultCostPerHaUsd: parsedCost,
      });
      console.log("[ADD_FIELD] Field created successfully");
      setName("");
      setLocation("");
      setZone("");
      setDefaultCostPerHaUsd("0");
      setSelection({ pointA: null, pointB: null, pointC: null });
      setOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo crear el campo.";
      console.error("[ADD_FIELD] Error:", message, submitError);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer border-dashed border-2 border-border hover:border-primary/40 transition-colors group">
          <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-30 gap-2">
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium">Agregar campo</span>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[calc(100vh-8rem)] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo campo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2 flex-1 overflow-hidden">
          <div className="overflow-y-auto pr-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Estancia La Esperanza" />
          </div>
          <div className="space-y-2">
            <Label>Seleccion en mapa (rectangulo rotado)</Label>
            <FieldBoundingBoxMap selection={selection} onSelectionChange={setSelection} />
            <p className="text-xs text-muted-foreground">
              Click 1: primer vertice. Click 2: direccion del lado largo. Click 3: ancho del rectangulo. Click 4 reinicia.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border px-3 py-2">
              <p className="font-medium text-foreground">Punto A</p>
              <p>{selection.pointA ? formatPoint(selection.pointA) : "Sin seleccionar"}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="font-medium text-foreground">Punto B</p>
              <p>{selection.pointB ? formatPoint(selection.pointB) : "Sin seleccionar"}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="font-medium text-foreground">Punto C</p>
              <p>{selection.pointC ? formatPoint(selection.pointC) : "Sin seleccionar"}</p>
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Superficie estimada</p>
            <p className="text-muted-foreground">
              {computedHectares ? `${computedHectares.toLocaleString("es-AR")} ha` : "Selecciona 3 puntos para calcular"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicacion (opcional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Pergamino, Buenos Aires"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone">Zona (opcional)</Label>
            <Input
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ej: Pampa Humeda"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCostPerHaUsd">Costo base (USD/ha)</Label>
            <Input
              id="defaultCostPerHaUsd"
              type="number"
              min="0"
              step="0.01"
              value={defaultCostPerHaUsd}
              onChange={(e) => setDefaultCostPerHaUsd(e.target.value)}
              placeholder="Ej: 380"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear campo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}