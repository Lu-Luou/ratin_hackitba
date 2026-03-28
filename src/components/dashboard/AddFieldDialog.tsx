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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hectares) return;
    addField(name.trim(), Number(hectares));
    setName("");
    setHectares("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer border-dashed border-2 border-border hover:border-primary/40 transition-colors group">
          <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
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
            <Input id="hectares" type="number" value={hectares} onChange={(e) => setHectares(e.target.value)} placeholder="Ej: 500" />
          </div>
          <Button type="submit" className="w-full">Crear campo</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
