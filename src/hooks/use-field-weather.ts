import { useEffect, useState } from "react";
import type { WeatherData } from "@/lib/weather/provider";

type UseWeatherState = {
  loading: boolean;
  data: WeatherData | null;
  error: string | null;
};

export function useFieldWeather(fieldId: string) {
  const [state, setState] = useState<UseWeatherState>({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    async function fetchWeather() {
      try {
        setState({ loading: true, data: null, error: null });

        const response = await fetch(`/api/fields/${fieldId}/weather`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar datos climáticos.");
        }

        const { data } = (await response.json().catch(() => ({}))) as { data: WeatherData | null };

        setState({ loading: false, data, error: null });
      } catch (error) {
        setState({
          loading: false,
          data: null,
          error: error instanceof Error ? error.message : "Error desconocido al cargar clima.",
        });
      }
    }

    if (fieldId) {
      fetchWeather();
    }
  }, [fieldId]);

  return state;
}
