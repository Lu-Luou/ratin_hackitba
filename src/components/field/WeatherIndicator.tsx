import type { WeatherData } from "@/lib/weather/provider";
import { Cloud, Droplets, Wind, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type WeatherIndicatorProps = {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  compact?: boolean;
};

function riskScoreBg(score: number): string {
  if (score >= 75) return "bg-destructive/10";
  if (score >= 50) return "bg-warning/10";
  return "bg-success/10";
}

function riskScoreColor(score: number): string {
  if (score >= 75) return "text-destructive";
  if (score >= 50) return "text-warning";
  return "text-success";
}

export function WeatherIndicator({ weather, loading, error, compact = false }: WeatherIndicatorProps) {
  if (loading) {
    return (
      <div className={cn("rounded-md border bg-muted/10 px-3 py-2", compact ? "min-h-32 text-xs" : "text-sm")}>
        <div className="text-muted-foreground animate-pulse">Cargando clima...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={cn("rounded-md border border-muted-foreground/30 bg-muted/10 px-3 py-2", compact ? "min-h-32 text-xs" : "text-sm")}>
        <div className="text-muted-foreground">{error ?? "Sin datos climáticos"}</div>
      </div>
    );
  }

  const { metrics } = weather;

  return (
    <div className={cn("rounded-md border bg-muted/20 px-3 py-2 space-y-2", compact ? "min-h-32 text-xs" : "text-sm")}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Clima (últimos 30 días)</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("rounded px-2 py-1 font-semibold", riskScoreBg(metrics.riskScore), riskScoreColor(metrics.riskScore))}>
              Riesgo: {Math.round(metrics.riskScore)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Score de riesgo climático: {metrics.riskScore.toFixed(1)}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Temperature */}
        <div className="flex items-center gap-1">
          <Cloud className="h-3.5 w-3.5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="font-mono font-semibold">
              {metrics.minTemperatureCelsius !== null && metrics.maxTemperatureCelsius !== null
                ? `${metrics.minTemperatureCelsius}–${metrics.maxTemperatureCelsius}°C`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Precipitation */}
        <div className="flex items-center gap-1">
          <Droplets className="h-3.5 w-3.5 text-cyan-500" />
          <div>
            <p className="text-xs text-muted-foreground">Lluvia</p>
            <p className="font-mono font-semibold">{metrics.totalPrecipitationMm !== null ? `${metrics.totalPrecipitationMm} mm` : "N/A"}</p>
          </div>
        </div>

        {/* Wind */}
        <div className="flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-orange-500" />
          <div>
            <p className="text-xs text-muted-foreground">Viento máx</p>
            <p className="font-mono font-semibold">{metrics.maxWindSpeedKmh !== null ? `${metrics.maxWindSpeedKmh} km/h` : "N/A"}</p>
          </div>
        </div>

        {/* Extreme Weather */}
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">Extremos</p>
            <p className="font-mono font-semibold">{metrics.extremeWeatherDayCount} días</p>
          </div>
        </div>
      </div>

      {!compact && weather.warning && (
        <div className="rounded bg-warning/20 border border-warning/30 p-1.5 text-xs text-warning-foreground">
          ⚠️ {weather.warning}
        </div>
      )}
    </div>
  );
}
