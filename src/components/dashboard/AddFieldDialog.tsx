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
  const [hectares, setHectares] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHectares = Number(hectares);

    if (!name.trim() || !Number.isFinite(parsedHectares) || parsedHectares <= 0) {
      setError("Completa nombre y una superficie valida.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await addField(name.trim(), parsedHectares);
      setName("");
      setHectares("");
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear campo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
