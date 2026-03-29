import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldCard } from "@/components/dashboard/FieldCard";
import { AddFieldDialog } from "@/components/dashboard/AddFieldDialog";
import { FieldDetail } from "@/components/field/FieldDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFields } from "@/context/FieldsContext";
import { Search, ShieldCheck } from "lucide-react";
import type { AlertsApiResponse, WeatherAlertItem } from "@/types/alert";
import type { FieldProfile } from "@/types/field";
import { computeFieldAlertRiskAdjustment } from "@/lib/alerts/risk-impact";
import { cn } from "@/lib/utils";

function SortableFieldCard({
  field,
  activeAlertCount,
  onClick,
  disabled,
}: {
  field: FieldProfile;
  activeAlertCount: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("h-full touch-none", isDragging ? "z-20" : null)}
      {...attributes}
      {...listeners}
    >
      <FieldCard
        field={field}
        activeAlertCount={activeAlertCount}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function DashboardView({ filter }: { filter?: string }) {
  const { fields, isLoading, error, refreshFields, reorderFields, selectedField, setSelectedField } = useFields();
  const [search, setSearch] = useState("");
  const [activeAlerts, setActiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const response = await fetch("/api/alerts", {
          method: "GET",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<AlertsApiResponse> & { error?: string };

        if (!response.ok || cancelled) {
          return;
        }

        setActiveAlerts(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!cancelled) {
          setActiveAlerts([]);
        }
      }
    }

    void fetchAlerts();

    const intervalId = window.setInterval(() => {
      void fetchAlerts();
    }, 90_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const alertCountByFieldId = useMemo(() => {
    const entries = fields.map((field) => {
      const adjustment = computeFieldAlertRiskAdjustment(field, activeAlerts);
      return [field.id, adjustment.matchedAlertsCount] as const;
    });

    return Object.fromEntries(entries);
  }, [fields, activeAlerts]);

  const filtered = useMemo(() => {
    let result = fields;

    if (search) {
      result = result.filter((field) => field.name.toLowerCase().includes(search.toLowerCase()));
    }

    switch (filter) {
      case "recent":
        result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "top":
        result = [...result].sort((a, b) => b.monthlyRevenueChange - a.monthlyRevenueChange);
        break;
      case "risk":
        result = result.filter(
          (field) => field.risk.climate === "Alto" || field.risk.market === "Alto" || field.risk.logistics === "Alto",
        );
        break;
      case "zone":
        result = [...result].sort((a, b) => a.zone.localeCompare(b.zone));
        break;
      default:
        break;
    }

    return result;
  }, [fields, search, filter]);

  const isRiskFilter = filter === "risk";
  const reorderEnabled = !filter && search.trim().length === 0;
  const canDragReorder = reorderEnabled && filtered.length > 1;
  const hasAnyFields = fields.length > 0;
  const showHealthyRiskState = isRiskFilter && hasAnyFields && filtered.length === 0 && search.trim().length === 0;
  const showAddFieldDialog = !(showHealthyRiskState);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canDragReorder || isPersistingOrder) {
        return;
      }

      const { active, over } = event;

      if (!over) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) {
        return;
      }

      const oldIndex = filtered.findIndex((field) => field.id === activeId);
      const newIndex = filtered.findIndex((field) => field.id === overId);

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const reordered = arrayMove(filtered, oldIndex, newIndex);

      setIsPersistingOrder(true);

      try {
        await reorderFields(reordered.map((field) => field.id));
      } finally {
        setIsPersistingOrder(false);
      }
    },
    [canDragReorder, filtered, isPersistingOrder, reorderFields],
  );

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
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar campos..."
          className="pl-9"
        />
      </div>

      {hasAnyFields ? (
        <p className="text-xs text-muted-foreground">
          {reorderEnabled
            ? "Arrastra cualquier tarjeta para guardar tu orden personalizado."
            : "Para reordenar campos, limpia la busqueda y los filtros activos."}
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        {canDragReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void handleDragEnd(event);
            }}
          >
            <SortableContext items={filtered.map((field) => field.id)} strategy={rectSortingStrategy}>
              {filtered.map((field) => (
                <SortableFieldCard
                  key={field.id}
                  field={field}
                  activeAlertCount={alertCountByFieldId[field.id] ?? 0}
                  onClick={() => setSelectedField(field)}
                  disabled={isPersistingOrder}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          filtered.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              activeAlertCount={alertCountByFieldId[field.id] ?? 0}
              onClick={() => setSelectedField(field)}
            />
          ))
        )}
        {showAddFieldDialog ? <AddFieldDialog /> : null}
      </div>

      {filtered.length === 0 ? (
        showHealthyRiskState ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-success" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-success">Todo en orden</p>
                <p className="text-sm text-foreground/80">No hay campos en alto riesgo. Todo en orden!!</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            {search.trim().length > 0 && hasAnyFields
              ? "No se encontraron campos con ese criterio."
              : "No hay campos cargados todavia para este usuario."}
          </div>
        )
      ) : null}
    </div>
  );
}
