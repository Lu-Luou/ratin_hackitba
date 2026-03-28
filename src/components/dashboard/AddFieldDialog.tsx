import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useFields } from "@/context/FieldsContext";
import { Card, CardContent } from "@/components/ui/card";

export function AddFieldDialog() {
  const { addField } = useFields();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [zone, setZone] = useState("");
  const [hectares, setHectares] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHectares = Number(hectares);
    const hasLatitude = latitude.trim().length > 0;
    const hasLongitude = longitude.trim().length > 0;
    const parsedLatitude = hasLatitude ? Number(latitude) : null;
    const parsedLongitude = hasLongitude ? Number(longitude) : null;

    if (!name.trim() || !Number.isFinite(parsedHectares) || parsedHectares <= 0) {
      setError("Completa nombre y una superficie valida.");
      return;
    }

    if ((hasLatitude && !hasLongitude) || (!hasLatitude && hasLongitude)) {
      setError("Si ingresas coordenadas, completa latitud y longitud.");
      return;
    }

    if (
      parsedLatitude !== null &&
      (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)
    ) {
      setError("La latitud debe estar entre -90 y 90.");
      return;
    }

    if (
      parsedLongitude !== null &&
      (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180)
    ) {
      setError("La longitud debe estar entre -180 y 180.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await addField({
        name: name.trim(),
        hectares: parsedHectares,
        location: location.trim() || undefined,
        zone: zone.trim() || undefined,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      });
      setName("");
      setLocation("");
      setZone("");
      setHectares("");
      setLatitude("");
      setLongitude("");
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el campo.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo campo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Estancia La Esperanza" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hectares">Superficie (ha)</Label>
            <Input
              id="hectares"
              type="number"
              min={1}
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              placeholder="Ej: 500"
            />
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
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            Para obtener coordenadas, abre Google Maps, marca el punto del campo y copia latitud/longitud.
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="ml-1 font-medium text-primary underline"
            >
              Abrir Maps
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitud</Label>
              <Input
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Ej: -34.603722"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitud</Label>
              <Input
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Ej: -58.381592"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear campo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
