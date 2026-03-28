"use client";

import { AlertCircle, AlertOctagon, ShieldCheck, TriangleAlert, type LucideIcon, X } from "lucide-react";
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

type PriorityTone = {
  level: "baja" | "media" | "alta" | "critica";
  label: string;
  attention: string;
  icon: LucideIcon;
  railClass: string;
  cardClass: string;
  labelClass: string;
  scoreClass: string;
};

function getPriorityTone(priorityScore: number): PriorityTone {
  if (priorityScore > 8) {
    return {
      level: "critica",
      label: "Critica",
      attention: "Atencion inmediata",
      icon: AlertOctagon,
      railClass: "bg-linear-to-b from-red-600 to-rose-500",
      cardClass: "border-red-200/90 bg-linear-to-r from-red-50/75 via-background to-background",
      labelClass: "border-red-200 bg-red-100 text-red-700",
      scoreClass: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (priorityScore >= 5) {
    return {
      level: "alta",
      label: "Alta",
      attention: "Revisar hoy",
      icon: TriangleAlert,
      railClass: "bg-linear-to-b from-orange-500 to-amber-500",
      cardClass: "border-orange-200/85 bg-linear-to-r from-orange-50/70 via-background to-background",
      labelClass: "border-orange-200 bg-orange-100 text-orange-700",
      scoreClass: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  if (priorityScore >= 2) {
    return {
      level: "media",
      label: "Media",
      attention: "Monitoreo activo",
      icon: AlertCircle,
      railClass: "bg-linear-to-b from-yellow-500 to-amber-400",
      cardClass: "border-yellow-200/85 bg-linear-to-r from-yellow-50/70 via-background to-background",
      labelClass: "border-yellow-200 bg-yellow-100 text-yellow-800",
      scoreClass: "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  }

  return {
    level: "baja",
    label: "Baja",
    attention: "Seguimiento",
    icon: ShieldCheck,
    railClass: "bg-linear-to-b from-emerald-600 to-lime-500",
    cardClass: "border-emerald-200/85 bg-linear-to-r from-emerald-50/70 via-background to-background",
    labelClass: "border-emerald-200 bg-emerald-100 text-emerald-700",
    scoreClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatIssuedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ahora";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

  const orderedAlerts = [...alerts].sort((a, b) => b.priorityScore - a.priorityScore);
  const counters = orderedAlerts.reduce(
    (accumulator, alert) => {
      const tone = getPriorityTone(alert.priorityScore);
      accumulator[tone.level] += 1;
      return accumulator;
    },
    { critica: 0, alta: 0, media: 0, baja: 0 },
  );

  return (
    <div className="fixed right-4 top-18 z-90 w-[min(92vw,31rem)] animate-in fade-in slide-in-from-top-4 duration-200">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border bg-linear-to-r from-card via-primary/10 to-card px-4 py-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Noticias meteorologicas personalizadas</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {source === "mock" ? "Mock" : "Base real"}
              </Badge>
              <span>Ordenadas por prioridad de atencion</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {counters.critica > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {counters.critica}
              </span>
            )}
            {counters.alta > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {counters.alta}
              </span>
            )}
            {counters.media > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {counters.media}
              </span>
            )}
            {counters.baja > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {counters.baja}
              </span>
            )}
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

          {!isLoading && !error && orderedAlerts.length > 0 && (
            <div className="space-y-3">
              {orderedAlerts.map((alert) => {
                const highlights = extractHighlights(alert);
                const tone = getPriorityTone(alert.priorityScore);
                const PriorityIcon = tone.icon;

                return (
                  <article key={alert.id} className={`relative overflow-hidden rounded-lg border p-3 ${tone.cardClass}`}>
                    <span className={`absolute inset-y-0 left-0 w-1 ${tone.railClass}`} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 pl-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${tone.labelClass}`}>
                            <PriorityIcon className="mr-1 h-3 w-3" />
                            {tone.label}
                          </Badge>
                          <span className="text-[11px] font-medium text-muted-foreground">{tone.attention}</span>
                          <span className="text-[11px] text-muted-foreground">{formatIssuedAt(alert.issuedAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{alert.description}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] uppercase tracking-wide ${tone.scoreClass}`}>
                        P{alert.priorityScore}
                      </Badge>
                    </div>

                    <p className="mt-2 pl-2 text-xs text-muted-foreground">{alert.location}</p>

                    {highlights.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-2">
                        {highlights.map((item) => (
                          <span key={item} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5 pl-2">
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
