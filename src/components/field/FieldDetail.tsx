import { FieldProfile } from "@/data/mockFields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import { FieldChatPanel } from "./FieldChatPanel";

function riskBadgeVariant(level: string): "default" | "secondary" | "destructive" {
  if (level === "Bajo") return "secondary";
  if (level === "Medio") return "default";
  return "destructive";
}

export function FieldDetail({ field, onBack }: { field: FieldProfile; onBack: () => void }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative min-h-full">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">{field.name}</h2>
            <p className="text-sm text-muted-foreground">{field.location} · {field.hectares} ha</p>
          </div>
        </div>

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
