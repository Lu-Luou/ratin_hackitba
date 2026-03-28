import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, LayoutDashboard, MessageCircle, User } from "lucide-react";
import { AlertsToast } from "@/components/layout/AlertsToast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlertsApiResponse, WeatherAlertItem } from "@/types/alert";

function getAlertsTone(totalAlertPoints: number) {
  if (totalAlertPoints > 8) {
    return {
      gradientClass: "from-red-600 to-rose-500",
      haloClass: "shadow-[0_0_0_1px_rgba(220,38,38,0.28),0_8px_24px_-12px_rgba(220,38,38,0.75)]",
      dotClass: "bg-red-200",
      label: "Critico",
    };
  }

  if (totalAlertPoints >= 5) {
    return {
      gradientClass: "from-orange-500 to-amber-500",
      haloClass: "shadow-[0_0_0_1px_rgba(249,115,22,0.25),0_8px_24px_-12px_rgba(249,115,22,0.75)]",
      dotClass: "bg-orange-100",
      label: "Alto",
    };
  }

  if (totalAlertPoints >= 2) {
    return {
      gradientClass: "from-yellow-500 to-amber-400",
      haloClass: "shadow-[0_0_0_1px_rgba(234,179,8,0.24),0_8px_24px_-12px_rgba(234,179,8,0.72)]",
      dotClass: "bg-yellow-50",
      label: "Medio",
    };
  }

  return {
    gradientClass: "from-emerald-600 to-lime-500",
    haloClass: "shadow-[0_0_0_1px_rgba(22,163,74,0.25),0_8px_24px_-12px_rgba(22,163,74,0.72)]",
    dotClass: "bg-emerald-100",
    label: "Bajo",
  };
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([]);
  const [alertsSource, setAlertsSource] = useState<"mock" | "database">("mock");
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [isAlertsToastOpen, setIsAlertsToastOpen] = useState(false);

  const totalAlertPoints = useMemo(
    () => alerts.reduce((sum, alert) => sum + Math.max(0, alert.priorityScore), 0),
    [alerts],
  );
  const alertsTone = useMemo(() => getAlertsTone(totalAlertPoints), [totalAlertPoints]);

  const fetchAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);

    try {
      const response = await fetch("/api/alerts", {
        method: "GET",
        credentials: "include",
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<AlertsApiResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar las alertas.");
      }

      setAlerts(Array.isArray(payload.data) ? payload.data : []);
      setAlertsSource(payload.meta?.source === "database" ? "database" : "mock");
      setAlertsError(null);
    } catch (error) {
      setAlerts([]);
      setAlertsSource("mock");
      setAlertsError(error instanceof Error ? error.message : "No se pudieron cargar las alertas.");
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();

    const intervalId = window.setInterval(() => {
      void fetchAlerts();
    }, 90_000);

    return () => window.clearInterval(intervalId);
  }, [fetchAlerts]);

  useEffect(() => {
    if (!isAlertsToastOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsAlertsToastOpen(false);
    }, 14_000);

    return () => window.clearTimeout(timeoutId);
  }, [isAlertsToastOpen]);

  function handleAlertsClick() {
    setIsAlertsToastOpen(true);

    if (!isLoadingAlerts) {
      void fetchAlerts();
    }
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/home");
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-display font-bold text-primary tracking-tight">The Precision Estate</h1>
      </div>

      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleAlertsClick}
          className={cn(
            "group relative isolate inline-flex h-10 items-center gap-2 overflow-hidden rounded-md px-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]",
            alertsTone.haloClass,
            isAlertsToastOpen && "ring-2 ring-offset-1 ring-primary/40",
          )}
        >
          <span className={cn("absolute inset-0 bg-linear-to-r", alertsTone.gradientClass)} aria-hidden="true" />
          <span className="relative inline-flex items-center gap-2">
            {alertsError ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
            ALERTS
            <span className={cn("h-2 w-2 rounded-full", alertsTone.dotClass)} aria-hidden="true" />
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs font-bold tabular-nums">{totalAlertPoints} pts</span>
            <span className="hidden text-[10px] uppercase tracking-wide text-white/85 md:inline">{alertsTone.label}</span>
          </span>
        </button>

        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            pathname === "/dashboard" && "bg-accent text-foreground",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/assistant"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            pathname === "/assistant" && "bg-accent text-foreground",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Assistant
        </Link>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Configuración</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            {isSigningOut ? "Cerrando sesion..." : "Cerrar sesion"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertsToast
        open={isAlertsToastOpen}
        onClose={() => setIsAlertsToastOpen(false)}
        alerts={alerts}
        source={alertsSource}
        isLoading={isLoadingAlerts}
        error={alertsError}
      />
    </header>
  );
}
