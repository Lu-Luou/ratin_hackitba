import { FieldProfile } from "@/data/mockFields";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function FieldCard({ field, onClick }: { field: FieldProfile; onClick: () => void }) {
  const positive = field.monthlyRevenueChange >= 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/60 group"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-foreground text-base">{field.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{field.hectares} ha · {field.zone}</p>
          </div>
          <div className={cn("rounded-full px-3 py-1 text-sm font-bold", scoreBg(field.score), scoreColor(field.score))}>
            {field.score}
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
      </CardContent>
    </Card>
  );
}
