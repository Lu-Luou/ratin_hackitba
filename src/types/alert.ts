export type AlertSource = "mock" | "database";

export interface AlertFieldTag {
  id: string;
  name: string;
}

export interface WeatherAlertItem {
  id: string;
  relevanceScore: number;
  priorityScore: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  extractedVariables: Record<string, unknown>;
  affectedFields: AlertFieldTag[];
  issuedAt: string;
}

export interface AlertsApiResponse {
  data: WeatherAlertItem[];
  meta: {
    source: AlertSource;
    totalAlerts: number;
    generatedAt: string;
  };
}
