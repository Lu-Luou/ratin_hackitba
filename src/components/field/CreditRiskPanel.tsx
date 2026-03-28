import { useMemo, useState } from "react";
import type { FieldProfile } from "@/types/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type RepaymentFrequency = "monthly" | "quarterly";

type CreditRiskPanelProps = {
  field: FieldProfile;
  weatherRiskScore?: number | null;
  compact?: boolean;
};

type RiskBreakdown = {
  totalRiskScore: number;
  creditLimitUsd: number;
  expectedNetRevenueUsd: number;
  dscr: number;
  reasons: string[];
  inputs: {
    coverageRisk: number;
    leverageRisk: number;
    climateRisk: number;
    termRisk: number;
    liquidityRisk: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRiskLabel(score: number) {
  if (score < 35) return "Bajo";
  if (score < 65) return "Medio";
  return "Alto";
}

function toRiskBadgeVariant(score: number): "secondary" | "default" | "destructive" {
  if (score < 35) return "secondary";
  if (score < 65) return "default";
  return "destructive";
}

function estimateAnnualPayment(principal: number, annualRatePct: number, termMonths: number) {
  if (principal <= 0 || termMonths <= 0) {
    return 0;
  }

  const yearFraction = termMonths / 12;
  const grossRepayment = principal * (1 + (annualRatePct / 100) * yearFraction);

  return (grossRepayment / termMonths) * 12;
}

function computeRisk(args: {
  field: FieldProfile;
  weatherRiskScore: number | null;
  amountUsd: number;
  termMonths: number;
  annualRatePct: number;
  graceMonths: number;
  collateralCoveragePct: number;
  hasInsurance: boolean;
  repaymentFrequency: RepaymentFrequency;
}): RiskBreakdown {
  const latestPrediction = args.field.latestPrediction;
  const predictionNet = latestPrediction?.netSpotUsd ?? 0;
  const fallbackRevenue = args.field.revenueHistory.length > 0
    ? args.field.revenueHistory.reduce((acc, point) => acc + point.actual, 0)
    : 0;
  const expectedNetRevenueUsd = Math.max(predictionNet, fallbackRevenue, 1);

  const baseLimit = expectedNetRevenueUsd * 0.55;
  const riskPenaltyFromField = ((args.field.risk.climateScore + args.field.risk.marketScore + args.field.risk.logisticsScore) / 3) / 100;
  const creditLimitUsd = Math.max(5000, baseLimit * (1 - riskPenaltyFromField * 0.35));

  const annualPayment = estimateAnnualPayment(args.amountUsd, args.annualRatePct, args.termMonths);
  const dscr = expectedNetRevenueUsd / Math.max(annualPayment, 1);

  const gracePenalty = clamp(args.graceMonths / 12, 0, 0.45);
  const frequencyPenalty = args.repaymentFrequency === "monthly" ? 0.06 : 0.02;
  const insuranceBonus = args.hasInsurance ? 0.08 : 0;

  const coverageRisk = clamp((1 - dscr / 1.6) + gracePenalty + frequencyPenalty - insuranceBonus, 0, 1);
  const leverageBase = clamp(args.amountUsd / Math.max(creditLimitUsd, 1), 0, 2.5);
  const leverageRisk = clamp((leverageBase / 1.6) - (args.collateralCoveragePct / 100) * 0.4, 0, 1);

  const weatherRiskRaw = args.weatherRiskScore ?? args.field.risk.climateScore;
  const climateRisk = clamp(weatherRiskRaw / 100, 0, 1);

  const termRisk = clamp(args.termMonths / 30 + args.annualRatePct / 60, 0, 1);
  const liquidityRisk = clamp((1 / Math.max(args.field.repayment.ratio, 0.3)) + args.field.repayment.debtToAsset * 0.7, 0, 1);

  const totalRisk =
    coverageRisk * 0.33 +
    leverageRisk * 0.24 +
    climateRisk * 0.18 +
    termRisk * 0.11 +
    liquidityRisk * 0.14;

  const totalRiskScore = Number((clamp(totalRisk, 0, 1) * 100).toFixed(1));
  const reasons: string[] = [];

  if (dscr < 1.0) {
    reasons.push("La cuota anual estimada supera la capacidad neta esperada del campo.");
  }

  if (args.amountUsd > creditLimitUsd) {
    reasons.push("El monto solicitado excede el limite recomendado para este perfil.");
  }

  if ((args.weatherRiskScore ?? args.field.risk.climateScore) > 70) {
    reasons.push("La exposicion climatica reciente aumenta la probabilidad de desvio de ingresos.");
  }

  if (args.collateralCoveragePct < 45) {
    reasons.push("La cobertura de colateral es baja para el nivel de deuda solicitado.");
  }

  if (args.annualRatePct > 32) {
    reasons.push("La tasa seleccionada incrementa la carga financiera esperada.");
  }

  if (reasons.length === 0) {
    reasons.push("Perfil equilibrado para las condiciones seleccionadas.");
  }

  return {
    totalRiskScore,
    creditLimitUsd: Number(creditLimitUsd.toFixed(0)),
    expectedNetRevenueUsd: Number(expectedNetRevenueUsd.toFixed(0)),
    dscr: Number(dscr.toFixed(2)),
    reasons,
    inputs: {
      coverageRisk: Number((coverageRisk * 100).toFixed(1)),
      leverageRisk: Number((leverageRisk * 100).toFixed(1)),
      climateRisk: Number((climateRisk * 100).toFixed(1)),
      termRisk: Number((termRisk * 100).toFixed(1)),
      liquidityRisk: Number((liquidityRisk * 100).toFixed(1)),
    },
  };
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CreditRiskPanel({ field, weatherRiskScore = null, compact = false }: CreditRiskPanelProps) {
  const [amountUsd, setAmountUsd] = useState(20000);
  const [termMonths, setTermMonths] = useState(12);
  const [annualRatePct, setAnnualRatePct] = useState(24);
  const [graceMonths, setGraceMonths] = useState(1);
  const [collateralCoveragePct, setCollateralCoveragePct] = useState(50);
  const [hasInsurance, setHasInsurance] = useState(true);
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>("monthly");

  const risk = useMemo(
    () =>
      computeRisk({
        field,
        weatherRiskScore,
        amountUsd,
        termMonths,
        annualRatePct,
        graceMonths,
        collateralCoveragePct,
        hasInsurance,
        repaymentFrequency,
      }),
    [
      field,
      weatherRiskScore,
      amountUsd,
      termMonths,
      annualRatePct,
      graceMonths,
      collateralCoveragePct,
      hasInsurance,
      repaymentFrequency,
    ],
  );

  return (
    <Card className={cn(compact ? "border-dashed" : "")} onClick={(event) => event.stopPropagation()}>
      <CardHeader className={cn("pb-2", compact ? "px-3 pt-3" : "")}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm font-medium")}>Riesgo Crediticio</CardTitle>
          <Badge variant={toRiskBadgeVariant(risk.totalRiskScore)}>
            {toRiskLabel(risk.totalRiskScore)} · {risk.totalRiskScore.toFixed(1)}
          </Badge>
        </div>
        <Progress value={risk.totalRiskScore} className={cn(compact ? "h-1.5" : "h-2")} />
      </CardHeader>

      <CardContent className={cn(compact ? "px-3 pb-3 space-y-2" : "space-y-4")}>
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4") }>
          <div className="space-y-1">
            <Label className="text-xs">Monto (USD)</Label>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={amountUsd}
              onChange={(event) => setAmountUsd(clamp(Number(event.target.value || 0), 1000, 2_000_000))}
              className={cn(compact ? "h-8 text-xs" : "")}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Plazo (meses)</Label>
            <Input
              type="number"
              min={3}
              max={48}
              step={1}
              value={termMonths}
              onChange={(event) => setTermMonths(clamp(Number(event.target.value || 0), 3, 48))}
              className={cn(compact ? "h-8 text-xs" : "")}
            />
          </div>

          {!compact ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Tasa anual (%)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  step={0.5}
                  value={annualRatePct}
                  onChange={(event) => setAnnualRatePct(clamp(Number(event.target.value || 0), 5, 60))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cobertura colateral (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={collateralCoveragePct}
                  onChange={(event) => setCollateralCoveragePct(clamp(Number(event.target.value || 0), 0, 100))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Meses de gracia</Label>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  step={1}
                  value={graceMonths}
                  onChange={(event) => setGraceMonths(clamp(Number(event.target.value || 0), 0, 12))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Frecuencia de pago</Label>
                <select
                  value={repaymentFrequency}
                  onChange={(event) => setRepaymentFrequency(event.target.value as RepaymentFrequency)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Seguro agricola</Label>
                <select
                  value={hasInsurance ? "yes" : "no"}
                  onChange={(event) => setHasInsurance(event.target.value === "yes")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="yes">Incluido</option>
                  <option value="no">No incluido</option>
                </select>
              </div>
            </>
          ) : null}
        </div>

        <div className={cn("grid gap-2 text-xs", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
          <div className="rounded border bg-muted/20 p-2">
            <p className="text-muted-foreground">Ingreso neto esperado</p>
            <p className="font-semibold">{formatUsd(risk.expectedNetRevenueUsd)}</p>
          </div>
          <div className="rounded border bg-muted/20 p-2">
            <p className="text-muted-foreground">Limite sugerido</p>
            <p className="font-semibold">{formatUsd(risk.creditLimitUsd)}</p>
          </div>
          <div className="rounded border bg-muted/20 p-2">
            <p className="text-muted-foreground">Cobertura DSCR</p>
            <p className={cn("font-semibold", risk.dscr >= 1.2 ? "text-success" : "text-destructive")}>{risk.dscr.toFixed(2)}x</p>
          </div>
          {!compact ? (
            <div className="rounded border bg-muted/20 p-2">
              <p className="text-muted-foreground">Riesgo climatico</p>
              <p className="font-semibold">{(weatherRiskScore ?? field.risk.climateScore).toFixed(1)}/100</p>
            </div>
          ) : null}
        </div>

        {!compact ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Como se calcula el riesgo crediticio</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El score final combina cinco factores ponderados: cobertura de pago (33%), apalancamiento del monto solicitado (24%),
              riesgo climatico (18%), presion por plazo y tasa (11%) y liquidez/deuda historica del productor (14%).
              Se estima capacidad con DSCR = ingreso neto esperado / cuota anual estimada. Riesgo alto cuando DSCR &lt; 1.0,
              monto supera el limite sugerido, o hay alta exposicion climatica.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border px-2 py-1">Cobertura pago: {risk.inputs.coverageRisk.toFixed(1)}</div>
              <div className="rounded border px-2 py-1">Apalancamiento: {risk.inputs.leverageRisk.toFixed(1)}</div>
              <div className="rounded border px-2 py-1">Riesgo climatico: {risk.inputs.climateRisk.toFixed(1)}</div>
              <div className="rounded border px-2 py-1">Plazo/Tasa: {risk.inputs.termRisk.toFixed(1)}</div>
              <div className="rounded border px-2 py-1 col-span-2">Liquidez historica: {risk.inputs.liquidityRisk.toFixed(1)}</div>
            </div>

            <ul className="space-y-1 text-xs text-muted-foreground">
              {risk.reasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
