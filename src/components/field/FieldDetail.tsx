import type { FieldProfile } from "@/types/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageCircle, FileText, Download, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useFields } from "@/context/FieldsContext";
import { FieldChatPanel } from "./FieldChatPanel";
import { useFieldWeather } from "@/hooks/use-field-weather";
import { CreditRiskPanel } from "./CreditRiskPanel";
import type { AlertsApiResponse, WeatherAlertItem } from "@/types/alert";
import { applyAlertRiskAdjustment, computeFieldAlertRiskAdjustment } from "@/lib/alerts/risk-impact";
import { FieldSatelliteMap } from "./FieldSatelliteMap";

type LenderReportData = {
  provider: {
    name: string;
    model: string;
    usedWebSearch: boolean;
  };
  headline: string;
  underwritingVerdict: "APPROVE_WITH_CONDITIONS" | "WATCHLIST" | "DECLINE";
  executiveSummary: string;
  riskFlags: string[];
  recommendation: string;
  narrative: string[];
  financialHighlights: string[];
  scenarioAnalysis: {
    baseCase: string;
    downsideCase: string;
    upsideCase: string;
  };
  actions: string[];
  citations: Array<{
    title: string;
    url: string;
  }>;
  generatedAt: string;
};

type ReportGenerationPhase = "idle" | "collecting" | "searching" | "generating" | "ready" | "error";

function riskBadgeVariant(level: string): "default" | "secondary" | "destructive" {
  if (level === "Bajo") return "secondary";
  if (level === "Medio") return "default";
  return "destructive";
}

function verdictBadgeVariant(verdict: LenderReportData["underwritingVerdict"]): "default" | "secondary" | "destructive" {
  if (verdict === "APPROVE_WITH_CONDITIONS") return "secondary";
  if (verdict === "WATCHLIST") return "default";
  return "destructive";
}

function verdictLabel(verdict: LenderReportData["underwritingVerdict"]) {
  if (verdict === "APPROVE_WITH_CONDITIONS") return "Aprobar con condiciones";
  if (verdict === "WATCHLIST") return "Watchlist";
  return "Declinar";
}

function normalizeReportData(raw: unknown): LenderReportData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<LenderReportData>;

  if (
    !candidate.provider ||
    typeof candidate.provider.name !== "string" ||
    typeof candidate.provider.model !== "string" ||
    typeof candidate.provider.usedWebSearch !== "boolean" ||
    typeof candidate.executiveSummary !== "string" ||
    typeof candidate.recommendation !== "string" ||
    !Array.isArray(candidate.riskFlags) ||
    typeof candidate.generatedAt !== "string"
  ) {
    return null;
  }

  return {
    provider: candidate.provider,
    headline: typeof candidate.headline === "string" ? candidate.headline : "Resumen de crédito agrícola",
    underwritingVerdict:
      candidate.underwritingVerdict === "APPROVE_WITH_CONDITIONS" ||
      candidate.underwritingVerdict === "WATCHLIST" ||
      candidate.underwritingVerdict === "DECLINE"
        ? candidate.underwritingVerdict
        : "WATCHLIST",
    executiveSummary: candidate.executiveSummary,
    riskFlags: candidate.riskFlags.filter((item): item is string => typeof item === "string"),
    recommendation: candidate.recommendation,
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === "string")
      : [],
    financialHighlights: Array.isArray(candidate.financialHighlights)
      ? candidate.financialHighlights.filter((item): item is string => typeof item === "string")
      : [],
    scenarioAnalysis:
      candidate.scenarioAnalysis &&
      typeof candidate.scenarioAnalysis.baseCase === "string" &&
      typeof candidate.scenarioAnalysis.downsideCase === "string" &&
      typeof candidate.scenarioAnalysis.upsideCase === "string"
        ? candidate.scenarioAnalysis
        : {
            baseCase: "No disponible.",
            downsideCase: "No disponible.",
            upsideCase: "No disponible.",
          },
    actions: Array.isArray(candidate.actions)
      ? candidate.actions.filter((item): item is string => typeof item === "string")
      : [],
    citations: Array.isArray(candidate.citations)
      ? candidate.citations.filter(
          (item): item is { title: string; url: string } =>
            !!item && typeof item === "object" && typeof item.title === "string" && typeof item.url === "string",
        )
      : [],
    generatedAt: candidate.generatedAt,
  };
}

export function FieldDetail({ field, onBack }: { field: FieldProfile; onBack: () => void }) {
  const { updateField, deleteField, refreshFields } = useFields();
  const { data: weatherData, loading: weatherLoading, error: weatherError } = useFieldWeather(field.id);
  const [activeAlerts, setActiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState(field.latestPrediction);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSavingDefaultCost, setIsSavingDefaultCost] = useState(false);
  const [costOverrideUsd, setCostOverrideUsd] = useState(String(field.defaultCostPerHaUsd));
  const [reportPhase, setReportPhase] = useState<ReportGenerationPhase>("idle");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<LenderReportData | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    setPrediction(field.latestPrediction);
    setCostOverrideUsd(String(field.defaultCostPerHaUsd));
  }, [field.id, field.latestPrediction, field.defaultCostPerHaUsd]);

  useEffect(() => {
    setReportPhase("idle");
    setReportError(null);
    setReportData(null);
    setIsDownloadingPdf(false);
  }, [field.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const response = await fetch("/api/alerts", {
          method: "GET",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<AlertsApiResponse> & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar las alertas activas.");
        }

        if (cancelled) {
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
  }, [field.id]);

  const riskAdjustment = useMemo(() => computeFieldAlertRiskAdjustment(field, activeAlerts), [field, activeAlerts]);
  const adjustedRisk = useMemo(() => applyAlertRiskAdjustment(field.risk, riskAdjustment), [field.risk, riskAdjustment]);
  const effectiveField = useMemo(
    () => ({
      ...field,
      risk: adjustedRisk,
    }),
    [field, adjustedRisk],
  );
  const adjustmentSummary = useMemo(() => {
    const chunks: string[] = [];

    if (riskAdjustment.deductions.climate > 0) {
      chunks.push(`Climatico -${riskAdjustment.deductions.climate.toFixed(1)}`);
    }

    if (riskAdjustment.deductions.market > 0) {
      chunks.push(`Mercado -${riskAdjustment.deductions.market.toFixed(1)}`);
    }

    if (riskAdjustment.deductions.logistics > 0) {
      chunks.push(`Logistica -${riskAdjustment.deductions.logistics.toFixed(1)}`);
    }

    return chunks.join(" | ");
  }, [riskAdjustment]);
  const matchedAlerts = useMemo(
    () => activeAlerts.filter((alert) => riskAdjustment.matchedAlertIds.includes(alert.id)),
    [activeAlerts, riskAdjustment.matchedAlertIds],
  );
  const matchedAlertsOrdered = useMemo(
    () => [...matchedAlerts].sort((a, b) => b.priorityScore - a.priorityScore),
    [matchedAlerts],
  );
  const topPhenomenon = matchedAlertsOrdered[0]?.description ?? null;
  const weatherMetrics = weatherData?.metrics ?? null;

  function formatUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatWeatherValue(value: number | null, decimals = 1) {
    if (value === null || Number.isNaN(value)) {
      return "N/A";
    }

    return value.toFixed(decimals);
  }

  function parseCostOverride() {
    const parsed = Number(costOverrideUsd);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("El costo por ha debe ser un numero mayor o igual a 0.");
    }

    return parsed;
  }

  function reportPhaseLabel(phase: ReportGenerationPhase) {
    if (phase === "collecting") return "Recolectando señales internas (geo, yield, NDVI, clima)...";
    if (phase === "searching") return "Buscando contexto externo de mercado y clima...";
    if (phase === "generating") return "Generando memo para underwriting bancario...";
    if (phase === "ready") return "Reporte listo.";
    if (phase === "error") return "No se pudo generar el reporte.";
    return "Sin generación activa.";
  }

  function reportPhaseProgress(phase: ReportGenerationPhase) {
    if (phase === "collecting") return 25;
    if (phase === "searching") return 55;
    if (phase === "generating") return 85;
    if (phase === "ready") return 100;
    if (phase === "error") return 100;
    return 0;
  }

  async function generateLenderReport() {
    if (reportPhase === "collecting" || reportPhase === "searching" || reportPhase === "generating") {
      return;
    }

    setReportError(null);
    setReportPhase("collecting");

    try {
      const contextResponse = await fetch(`/api/fields/${field.id}/report/context?includeLiveFeatures=true`, {
        method: "GET",
        credentials: "include",
      });
      const contextPayload = await contextResponse.json().catch(() => ({}));

      if (!contextResponse.ok) {
        throw new Error(contextPayload?.error ?? "No se pudo preparar el contexto del reporte.");
      }

      setReportPhase("searching");

      const phaseSwitchTimeout = window.setTimeout(() => {
        setReportPhase((current) => (current === "searching" ? "generating" : current));
      }, 1100);

      const response = await fetch(`/api/fields/${field.id}/report/generate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeWebSearch: true,
          includeLiveFeatures: true,
          format: "json",
        }),
      });

      window.clearTimeout(phaseSwitchTimeout);
      setReportPhase("generating");

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo generar el reporte LLM.");
      }

      const report = normalizeReportData(payload?.data?.report);

      if (!report) {
        throw new Error("El backend devolvio un reporte invalido.");
      }

      setReportData(report);
      setReportPhase("ready");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "No se pudo generar el reporte.");
      setReportPhase("error");
    }
  }

  async function downloadLenderReportPdf() {
    if (isDownloadingPdf) {
      return;
    }

    setReportError(null);
    setIsDownloadingPdf(true);

    if (reportPhase === "idle" || reportPhase === "error") {
      setReportPhase("collecting");
    }

    try {
      setReportPhase("searching");

      const response = await fetch(`/api/fields/${field.id}/report/generate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeWebSearch: true,
          includeLiveFeatures: true,
          format: "pdf",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo generar el PDF.");
      }

      setReportPhase("generating");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `field-report-${field.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      if (reportPhase !== "ready") {
        setReportPhase("ready");
      }
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "No se pudo descargar el PDF.");
      setReportPhase("error");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function runPrediction() {
    if (isPredicting) {
      return;
    }

    setPredictionError(null);
    setIsPredicting(true);

    try {
      const parsedCost = parseCostOverride();
      const response = await fetch(`/api/fields/${field.id}/prediction`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          costPerHaUsd: parsedCost,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo calcular la prediccion.");
      }

      setPrediction(payload?.data ?? null);
      await refreshFields();
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : "No se pudo calcular la prediccion.");
    } finally {
      setIsPredicting(false);
    }
  }

  async function saveDefaultCost() {
    if (isSavingDefaultCost) {
      return;
    }

    setPredictionError(null);
    setIsSavingDefaultCost(true);

    try {
      const parsedCost = parseCostOverride();
      await updateField(field.id, {
        defaultCostPerHaUsd: parsedCost,
      });
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : "No se pudo guardar el costo base.");
    } finally {
      setIsSavingDefaultCost(false);
    }
  }

  async function handleUpdate() {
    if (isUpdating || isDeleting) {
      return;
    }

    const nextName = window.prompt("Nuevo nombre del campo", field.name);

    if (nextName === null) {
      return;
    }

    const nextHectaresRaw = window.prompt("Superficie (ha)", String(field.hectares));

    if (nextHectaresRaw === null) {
      return;
    }

    const nextHectares = Number(nextHectaresRaw);

    if (!nextName.trim() || !Number.isFinite(nextHectares) || nextHectares <= 0) {
      setActionError("Nombre y superficie deben ser validos.");
      return;
    }

    const nextLocation = window.prompt("Ubicacion", field.location);
    if (nextLocation === null) {
      return;
    }

    const nextZone = window.prompt("Zona", field.zone);
    if (nextZone === null) {
      return;
    }

    const nextLatitudeRaw = window.prompt(
      "Latitud (deja vacio para quitarla)",
      field.latitude !== null ? String(field.latitude) : "",
    );
    if (nextLatitudeRaw === null) {
      return;
    }

    const nextLongitudeRaw = window.prompt(
      "Longitud (deja vacio para quitarla)",
      field.longitude !== null ? String(field.longitude) : "",
    );
    if (nextLongitudeRaw === null) {
      return;
    }

    const parsedLatitude = nextLatitudeRaw.trim().length > 0 ? Number(nextLatitudeRaw) : null;
    const parsedLongitude = nextLongitudeRaw.trim().length > 0 ? Number(nextLongitudeRaw) : null;

    if (
      parsedLatitude !== null &&
      (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)
    ) {
      setActionError("La latitud debe estar entre -90 y 90.");
      return;
    }

    if (
      parsedLongitude !== null &&
      (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180)
    ) {
      setActionError("La longitud debe estar entre -180 y 180.");
      return;
    }

    setActionError(null);
    setIsUpdating(true);

    try {
      await updateField(field.id, {
        name: nextName.trim(),
        hectares: Math.round(nextHectares),
        location: nextLocation.trim() || "Sin definir",
        zone: nextZone.trim() || "Sin definir",
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo actualizar el campo.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (isDeleting || isUpdating) {
      return;
    }

    const confirmed = window.confirm(`Eliminar el campo \"${field.name}\"? Esta accion no se puede deshacer.`);

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setIsDeleting(true);

    try {
      await deleteField(field.id);
      onBack();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo eliminar el campo.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative min-h-full">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-display font-bold text-foreground">{field.name}</h2>
            <p className="text-sm text-muted-foreground">{field.location} · {field.hectares} ha</p>
            <p className="text-xs text-muted-foreground mt-1">
              Coordenadas: {field.latitude !== null && field.longitude !== null ? `${field.latitude}, ${field.longitude}` : "Sin definir"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void handleUpdate()} disabled={isUpdating || isDeleting}>
              {isUpdating ? "Guardando..." : "Editar"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isUpdating || isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>

        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

        <Card className="border-border/70 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Reporte Crediticio Inteligente</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Análisis interpolado por LLM con señales Geo, Yield, NDVI, bandas espectrales, clima y riesgo financiero.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void generateLenderReport()}
                  disabled={reportPhase === "collecting" || reportPhase === "searching" || reportPhase === "generating"}
                >
                  {reportPhase === "collecting" || reportPhase === "searching" || reportPhase === "generating" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generar reporte
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void downloadLenderReportPdf()}
                  disabled={isDownloadingPdf || reportPhase === "collecting" || reportPhase === "searching" || reportPhase === "generating"}
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {reportPhase === "ready" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : reportPhase === "collecting" || reportPhase === "searching" || reportPhase === "generating" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : null}
                <span className={cn(reportPhase === "error" ? "text-destructive" : "text-muted-foreground")}>{reportPhaseLabel(reportPhase)}</span>
              </div>
              <Progress value={reportPhaseProgress(reportPhase)} className="h-2" />
            </div>

            {reportData ? (
              <div className="space-y-4 rounded-md border bg-card/70 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={verdictBadgeVariant(reportData.underwritingVerdict)}>{verdictLabel(reportData.underwritingVerdict)}</Badge>
                  <Badge variant="outline">{reportData.provider.name}</Badge>
                  <Badge variant="outline">{reportData.provider.model}</Badge>
                  <Badge variant={reportData.provider.usedWebSearch ? "default" : "secondary"}>
                    {reportData.provider.usedWebSearch ? "Con web search" : "Solo datos internos"}
                  </Badge>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-base font-semibold text-foreground">{reportData.headline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reportData.executiveSummary}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Highlights Financieros</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {reportData.financialHighlights.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Narrativa de Riesgo</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {reportData.narrative.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                {reportData.riskFlags.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Risk Flags</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {reportData.riskFlags.map((flag, index) => (
                        <li key={`${flag}-${index}`}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-md border bg-background/80 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Escenario Base</p>
                    <p className="mt-1 text-sm leading-relaxed">{reportData.scenarioAnalysis.baseCase}</p>
                  </div>
                  <div className="rounded-md border bg-background/80 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Escenario Bajista</p>
                    <p className="mt-1 text-sm leading-relaxed">{reportData.scenarioAnalysis.downsideCase}</p>
                  </div>
                  <div className="rounded-md border bg-background/80 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Escenario Alcista</p>
                    <p className="mt-1 text-sm leading-relaxed">{reportData.scenarioAnalysis.upsideCase}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Acciones Recomendadas</p>
                  <ul className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                    {reportData.actions.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Recomendación Ejecutiva</p>
                  <p className="text-sm leading-relaxed">{reportData.recommendation}</p>
                </div>

                {reportData.citations.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Fuentes Externas</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {reportData.citations.slice(0, 6).map((citation, index) => (
                        <li key={`${citation.url}-${index}`}>
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {index + 1}. {citation.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Generado: {new Date(reportData.generatedAt).toLocaleString("es-AR")} · Fuentes externas: {reportData.citations.length}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay reporte generado. Usa Generar reporte para crear un memo financiero y luego Descargar PDF para compartirlo.
              </p>
            )}

            {reportError ? <p className="text-sm text-destructive">{reportError}</p> : null}
          </CardContent>
        </Card>

        {/* Prediction & valuation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prediccion de Yield y Valor Soja (USD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Costo temporal (USD/ha)</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  step={0.01}
                  value={costOverrideUsd}
                  onChange={(event) => setCostOverrideUsd(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => void saveDefaultCost()} disabled={isSavingDefaultCost || isPredicting}>
                  {isSavingDefaultCost ? "Guardando costo..." : "Guardar como costo base"}
                </Button>
              </div>
              <div className="flex items-end justify-start sm:justify-end">
                <Button type="button" onClick={() => void runPrediction()} disabled={isPredicting}>
                  {isPredicting ? "Calculando..." : "Recalcular ahora"}
                </Button>
              </div>
            </div>

            {!prediction ? (
              <p className="text-sm text-muted-foreground">
                Todavia no hay una prediccion guardada para este campo. Ejecuta Recalcular ahora para obtener yield y valuaciones spot/futuros.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Yield estimado</p>
                    <p className="text-lg font-semibold">{prediction.predictedYieldTonHa.toFixed(2)} ton/ha</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Spot soja</p>
                    <p className="text-lg font-semibold">{formatUsd(prediction.spotPriceUsdPerTon)} / ton</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Bruto spot</p>
                    <p className="text-lg font-semibold">{formatUsd(prediction.grossSpotUsd)}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Neto spot</p>
                    <p className={cn("text-lg font-semibold", prediction.netSpotUsd >= 0 ? "text-success" : "text-destructive")}>
                      {formatUsd(prediction.netSpotUsd)}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-5 gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <span>Contrato</span>
                    <span>Expira</span>
                    <span>Precio/ton</span>
                    <span>Bruto</span>
                    <span>Neto</span>
                  </div>
                  <div className="space-y-0">
                    {prediction.futuresValuations.map((row) => (
                      <div key={row.symbol} className="grid grid-cols-5 gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                        <span>{row.label}</span>
                        <span>{row.expiration}</span>
                        <span>{formatUsd(row.priceUsdPerTon)}</span>
                        <span>{formatUsd(row.grossUsd)}</span>
                        <span className={cn(row.netUsd >= 0 ? "text-success" : "text-destructive")}>{formatUsd(row.netUsd)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ultima actualizacion: {new Date(prediction.createdAt).toLocaleString("es-AR")}. Ventana satelital: {prediction.startDate} a {prediction.endDate}.
                </p>
                {prediction.warning ? <p className="text-xs text-warning">Aviso del modelo: {prediction.warning}</p> : null}
              </div>
            )}

            {predictionError ? <p className="text-sm text-destructive">{predictionError}</p> : null}
          </CardContent>
        </Card>

        {/* Top cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Weather */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clima del lote</CardTitle>
                {weatherMetrics ? (
                  <Badge
                    variant={weatherMetrics.riskScore > 70 ? "outline" : "secondary"}
                    className={cn(
                      weatherMetrics.riskScore > 70
                        ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : undefined,
                    )}
                  >
                    Riesgo {Math.round(weatherMetrics.riskScore)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {weatherLoading ? (
                <p className="text-sm text-muted-foreground">Cargando datos climaticos...</p>
              ) : weatherError ? (
                <p className="text-sm text-destructive">{weatherError}</p>
              ) : !weatherMetrics ? (
                <p className="text-sm text-muted-foreground">Sin datos climaticos para este campo.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Temp prom</p>
                      <p className="font-semibold">{formatWeatherValue(weatherMetrics.avgTemperatureCelsius)} C</p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Rango temp</p>
                      <p className="font-semibold">
                        {formatWeatherValue(weatherMetrics.minTemperatureCelsius)} - {formatWeatherValue(weatherMetrics.maxTemperatureCelsius)} C
                      </p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Lluvia total</p>
                      <p className="font-semibold">{formatWeatherValue(weatherMetrics.totalPrecipitationMm)} mm</p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Deficit lluvia</p>
                      <p className="font-semibold">{formatWeatherValue(weatherMetrics.precipitationDeficitMm)} mm</p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Viento prom</p>
                      <p className="font-semibold">{formatWeatherValue(weatherMetrics.avgWindSpeedKmh)} km/h</p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Viento max</p>
                      <p className="font-semibold">{formatWeatherValue(weatherMetrics.maxWindSpeedKmh)} km/h</p>
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <p className="text-muted-foreground">Dias extremos</p>
                      <p className="font-semibold">{weatherMetrics.extremeWeatherDayCount} dias</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Ventana analizada: {weatherData.period}</p>
                    <p>Actualizado: {new Date(weatherData.fetchedAt).toLocaleString("es-AR")}</p>
                    {weatherData.warning ? <p className="text-warning">Aviso: {weatherData.warning}</p> : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Repayment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Capacidad de Repago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ratio</span>
                <span className="font-semibold">{field.repayment.ratio}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Liquidez</span>
                <Badge variant={field.repayment.liquidity === "Alta" ? "secondary" : field.repayment.liquidity === "Baja" ? "destructive" : "default"}>
                  {field.repayment.liquidity}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Deuda/Activo</span>
                <span className="font-semibold">{(field.repayment.debtToAsset * 100).toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Evaluación de Riesgo</CardTitle>
                {riskAdjustment.matchedAlertsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                    <TriangleAlert className="h-3 w-3" />
                    {riskAdjustment.matchedAlertsCount} alerta(s)
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Climático", level: effectiveField.risk.climate, score: effectiveField.risk.climateScore },
                { label: "Mercado", level: effectiveField.risk.market, score: effectiveField.risk.marketScore },
                { label: "Logística", level: effectiveField.risk.logistics, score: effectiveField.risk.logisticsScore },
              ].map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.label}</span>
                    <Badge variant={riskBadgeVariant(r.level)}>{r.level}</Badge>
                  </div>
                  <Progress value={r.score} className="h-1.5" />
                </div>
              ))}

              {riskAdjustment.matchedAlertsCount > 0 ? (
                <div className="rounded-md border border-orange-200 bg-orange-50/70 px-2 py-1.5 text-xs text-orange-900">
                  <p className="font-medium">Ajuste por alertas: {adjustmentSummary}</p>
                  {topPhenomenon ? <p className="mt-0.5 text-orange-800">Fenomeno principal: {topPhenomenon}</p> : null}
                  {matchedAlertsOrdered.length > 0 ? (
                    <p className="mt-0.5 text-orange-800">
                      Alertas vinculadas: {matchedAlertsOrdered.map((alert) => `P${alert.priorityScore}`).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <CreditRiskPanel field={effectiveField} weatherRiskScore={weatherData?.metrics.riskScore ?? null} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Imagen satelital del campo</CardTitle>
            <p className="text-xs text-muted-foreground">
              Vista interactiva con el area estimada del lote para validacion visual.
            </p>
          </CardHeader>
          <CardContent>
            <FieldSatelliteMap
              latitude={field.latitude}
              longitude={field.longitude}
              bboxMinLon={field.bboxMinLon}
              bboxMinLat={field.bboxMinLat}
              bboxMaxLon={field.bboxMaxLon}
              bboxMaxLat={field.bboxMaxLat}
            />
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue — Actual vs Proyectado (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={field.revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 15%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(150, 10%, 45%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(150, 10%, 45%)" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="hsl(152, 45%, 22%)" strokeWidth={2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="projected" stroke="hsl(152, 35%, 45%)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Proyectado" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating chat button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        size="icon"
        onClick={() => setChatOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat panel */}
      {chatOpen && <FieldChatPanel field={field} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
