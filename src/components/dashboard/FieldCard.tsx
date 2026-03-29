import type { FieldProfile } from "@/types/field";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldWeather } from "@/hooks/use-field-weather";
import { WeatherIndicator } from "@/components/field/WeatherIndicator";

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-warning/10";
  return "bg-destructive/10";
}

export function FieldCard({
  field,
  onClick,
  activeAlertCount = 0,
  isDragging = false,
}: {
  field: FieldProfile;
  onClick: () => void;
  activeAlertCount?: number;
  isDragging?: boolean;
}) {
  const positive = field.monthlyRevenueChange >= 0;
  const { data: weather, loading: weatherLoading, error: weatherError } = useFieldWeather(field.id);

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow border-border/60 group",
        isDragging ? "ring-2 ring-primary/30 shadow-md" : null,
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-foreground text-base">{field.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{field.hectares} ha · {field.zone}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {activeAlertCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                <TriangleAlert className="h-3 w-3" />
                {activeAlertCount} alerta(s)
              </span>
            ) : null}
            <div className={cn("rounded-full px-3 py-1 text-sm font-bold", scoreBg(field.score), scoreColor(field.score))}>
              {field.score}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {positive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span className={cn("text-sm font-medium", positive ? "text-success" : "text-destructive")}>
            {positive ? "+" : ""}{field.monthlyRevenueChange}%
          </span>
          <span className="text-xs text-muted-foreground">rev. mensual</span>
        </div>

        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs min-h-20">
          {field.latestPrediction ? (
            <>
              <p className="text-muted-foreground">Yield estimado</p>
              <p className="font-semibold text-foreground">{field.latestPrediction.predictedYieldTonHa.toFixed(2)} ton/ha</p>
              <p className={cn("font-semibold", field.latestPrediction.netSpotUsd >= 0 ? "text-success" : "text-destructive")}>
                Neto spot: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(field.latestPrediction.netSpotUsd)}
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Yield estimado</p>
              <p className="font-semibold text-muted-foreground">Pendiente de calculo</p>
              <p className="font-semibold text-muted-foreground">Neto spot: --</p>
            </>
          )}
        </div>

        <WeatherIndicator weather={weather ?? null} loading={weatherLoading} error={weatherError} compact={true} />
      </CardContent>
    </Card>
  );
}
