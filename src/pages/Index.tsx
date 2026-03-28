import { useState, useMemo } from "react";
import { useFields } from "@/context/FieldsContext";
import { FieldCard } from "@/components/dashboard/FieldCard";
import { AddFieldDialog } from "@/components/dashboard/AddFieldDialog";
import { FieldDetail } from "@/components/field/FieldDetail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function Index({ filter }: { filter?: string }) {
  const { fields, isLoading, error, refreshFields, selectedField, setSelectedField } = useFields();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = fields;

    if (search) {
      result = result.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    }

    switch (filter) {
      case "recent":
        result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "top":
        result = [...result].sort((a, b) => b.score - a.score);
        break;
      case "risk":
        result = result.filter((f) => f.score < 70);
        break;
      case "zone":
        result = [...result].sort((a, b) => a.zone.localeCompare(b.zone));
        break;
    }

    return result;
  }, [fields, search, filter]);

  if (selectedField) {
    return <FieldDetail field={selectedField} onBack={() => setSelectedField(null)} />;
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Cargando campos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" onClick={() => void refreshFields()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar campos..."
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((field) => (
          <FieldCard key={field.id} field={field} onClick={() => setSelectedField(field)} />
        ))}
        <AddFieldDialog />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          No hay campos cargados todavia para este usuario.
        </div>
      ) : null}
    </div>
  );
}
