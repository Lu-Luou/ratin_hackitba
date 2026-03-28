"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { FieldsProvider } from "@/context/FieldsContext";
import AssistantPage from "@/pages/Assistant";
import DashboardPage from "@/pages/Index";

type FieldInsightsView = "dashboard" | "assistant";

interface FieldInsightsAppProps {
  view: FieldInsightsView;
}

export function FieldInsightsApp({ view }: FieldInsightsAppProps) {
  return (
    <FieldsProvider>
      <AppLayout>
        {(filter) => (view === "dashboard" ? <DashboardPage filter={filter} /> : <AssistantPage />)}
      </AppLayout>
    </FieldsProvider>
  );
}