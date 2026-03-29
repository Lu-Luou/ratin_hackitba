import type { FieldProfile } from "@/types/field";
import { Card, CardContent } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldWeather } from "@/hooks/use-field-weather";
import { WeatherIndicator } from "@/components/field/WeatherIndicator";

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
  const { data: weather, loading: weatherLoading, error: weatherError } = useFieldWeather(field.id);

  return (
    <Card
      className={cn(
        "h-full cursor-pointer hover:shadow-md transition-shadow border-border/60 group",
        isDragging ? "ring-2 ring-primary/30 shadow-md" : null,
      )}
      onClick={onClick}
    >
      <CardContent className="h-full p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-foreground text-base">{field.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{field.hectares} ha · {field.zone}</p>
          </div>
          <div className="min-h-6 flex items-start">
            {activeAlertCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                <TriangleAlert className="h-3 w-3" />
                {activeAlertCount} alerta(s)
              </span>
            ) : null}
          </div>
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
