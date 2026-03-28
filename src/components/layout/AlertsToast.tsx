"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlertSource, WeatherAlertItem } from "@/types/alert";

interface AlertsToastProps {
  open: boolean;
  onClose: () => void;
  alerts: WeatherAlertItem[];
  source: AlertSource;
  isLoading: boolean;
  error: string | null;
}

function formatVariable(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(" - ");
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  if (typeof value === "boolean") {
    return value ? "si" : "no";
  }

  return String(value);
}

function extractHighlights(alert: WeatherAlertItem) {
  const entries = Object.entries(alert.extractedVariables).slice(0, 3);

  if (entries.length === 0) {
    return [];
  }

  return entries.map(([key, value]) => `${key}: ${formatVariable(value)}`);
}

export function AlertsToast({ open, onClose, alerts, source, isLoading, error }: AlertsToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed right-4 top-18 z-90 w-[min(92vw,30rem)] animate-in fade-in slide-in-from-top-4 duration-200">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border bg-linear-to-r from-card via-accent/40 to-card px-4 py-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Noticias meteorologicas personalizadas</h2>
            <p className="text-xs text-muted-foreground">
              {source === "mock" ? "Vista mockeada para diseno" : "Datos obtenidos desde alertas persistidas"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="max-h-104 overflow-y-auto p-4">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando alertas...</p>}
          {error && !isLoading && <p className="text-sm text-destructive">{error}</p>}

          {!isLoading && !error && alerts.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay alertas activas para tus campos en este momento.</p>
          )}

          {!isLoading && !error && alerts.length > 0 && (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const highlights = extractHighlights(alert);

                return (
                  <article key={alert.id} className="space-y-2 rounded-lg border border-border/80 bg-background/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{alert.description}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                        P{alert.priorityScore}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{alert.location}</p>

                    {highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {highlights.map((item) => (
                          <span key={item} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {alert.affectedFields.map((field) => (
                        <Badge key={`${alert.id}-${field.id}`} variant="secondary" className="text-[10px]">
                          {field.name}
                        </Badge>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
