"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { FieldsProvider } from "@/context/FieldsContext";
import AssistantView from "@/views/AssistantView";
import DashboardView from "@/views/DashboardView";

type FieldInsightsView = "dashboard" | "assistant";

interface FieldInsightsAppProps {
  view: FieldInsightsView;
}

export function FieldInsightsApp({ view }: FieldInsightsAppProps) {
  return (
    <FieldsProvider>
      <AppLayout showFilters={view === "dashboard"}>
        {(filter) => (view === "dashboard" ? <DashboardView filter={filter} /> : <AssistantView />)}
      </AppLayout>
    </FieldsProvider>
  );
}