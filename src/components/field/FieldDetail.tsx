import type { FieldProfile } from "@/types/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { useFields } from "@/context/FieldsContext";
import { FieldChatPanel } from "./FieldChatPanel";
import { useFieldWeather } from "@/hooks/use-field-weather";
import { CreditRiskPanel } from "./CreditRiskPanel";

function riskBadgeVariant(level: string): "default" | "secondary" | "destructive" {
  if (level === "Bajo") return "secondary";
  if (level === "Medio") return "default";
  return "destructive";
}

export function FieldDetail({ field, onBack }: { field: FieldProfile; onBack: () => void }) {
  const { updateField, deleteField, refreshFields } = useFields();
  const { data: weatherData } = useFieldWeather(field.id);
  const [chatOpen, setChatOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState(field.latestPrediction);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSavingDefaultCost, setIsSavingDefaultCost] = useState(false);
  const [costOverrideUsd, setCostOverrideUsd] = useState(String(field.defaultCostPerHaUsd));

  useEffect(() => {
    setPrediction(field.latestPrediction);
    setCostOverrideUsd(String(field.defaultCostPerHaUsd));
  }, [field.id, field.latestPrediction, field.defaultCostPerHaUsd]);

  function formatUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function parseCostOverride() {
    const parsed = Number(costOverrideUsd);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("El costo por ha debe ser un numero mayor o igual a 0.");
    }

    return parsed;
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
          {/* Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className={cn("text-4xl font-display font-bold",
                  field.score >= 80 ? "text-success" : field.score >= 60 ? "text-warning" : "text-destructive"
                )}>
                  {field.score}
                </span>
                <span className="text-muted-foreground text-sm mb-1">/100</span>
                <div className="ml-auto flex items-center gap-1">
                  {field.scoreTrend >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                  <span className={cn("text-sm font-medium", field.scoreTrend >= 0 ? "text-success" : "text-destructive")}>
                    {field.scoreTrend >= 0 ? "+" : ""}{field.scoreTrend}
                  </span>
                </div>
              </div>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Evaluación de Riesgo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Climático", level: field.risk.climate, score: field.risk.climateScore },
                { label: "Mercado", level: field.risk.market, score: field.risk.marketScore },
                { label: "Logística", level: field.risk.logistics, score: field.risk.logisticsScore },
              ].map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.label}</span>
                    <Badge variant={riskBadgeVariant(r.level)}>{r.level}</Badge>
                  </div>
                  <Progress value={r.score} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <CreditRiskPanel field={field} weatherRiskScore={weatherData?.metrics.riskScore ?? null} />

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
