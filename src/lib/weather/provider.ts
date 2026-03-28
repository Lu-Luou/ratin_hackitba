type OpenMeteoHourlyData = {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
};

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly?: OpenMeteoHourlyData;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

export type WeatherRiskMetrics = {
  avgTemperatureCelsius: number | null;
  minTemperatureCelsius: number | null;
  maxTemperatureCelsius: number | null;
  totalPrecipitationMm: number | null;
  avgWindSpeedKmh: number | null;
  maxWindSpeedKmh: number | null;
  extremeWeatherDayCount: number;
  precipitationDeficitMm: number | null;
  riskScore: number;
};

export type WeatherData = {
  latitude: number;
  longitude: number;
  fetchedAt: string;
  period: string;
  metrics: WeatherRiskMetrics;
  source: "open-meteo";
  warning?: string;
};

/**
 * WMO Weather interpretation codes:
 * 0-3: Clear/cloudy
 * 4-49: Mainly clear/cloudy variants
 * 50-67: Drizzle/rain
 * 68-77: Freezing drizzle/rain
 * 80-82: Heavy rain showers
 * 85-86: Heavy rain and snow showers
 * 95-99: Thunderstorms
 */
function isExtremeWeather(code: number): boolean {
  return code >= 80; // Heavy showers, rain, thunderstorms
}

function assessRainfall(totalMm: number | null): number {
  if (totalMm === null) {
    return 50;
  }

  if (totalMm < 10) {
    return Math.max(0, 100 - totalMm * 5);
  }

  if (totalMm > 100) {
    return Math.max(50, 100 - (totalMm - 100) * 0.5);
  }

  return 30;
}

function assessTemperature(minTemp: number | null, maxTemp: number | null): number {
  let score = 50;

  if (minTemp !== null && minTemp < 5) {
    score -= 20;
  }

  if (maxTemp !== null && maxTemp > 30) {
    score -= 15;
  }

  return Math.max(0, score);
}

function assessWind(maxWind: number | null): number {
  if (maxWind === null) {
    return 50;
  }

  if (maxWind > 50) {
    return 20;
  }

  if (maxWind > 35) {
    return 40;
  }

  return 70;
}

function computeRiskScore(metrics: WeatherRiskMetrics): number {
  const rainfallRisk = assessRainfall(metrics.totalPrecipitationMm);
  const tempRisk = assessTemperature(metrics.minTemperatureCelsius, metrics.maxTemperatureCelsius);
  const windRisk = assessWind(metrics.maxWindSpeedKmh);
  const extremeWeatherPenalty = Math.min(30, metrics.extremeWeatherDayCount * 5);

  const combinedScore = rainfallRisk * 0.35 + tempRisk * 0.25 + windRisk * 0.2 + (100 - extremeWeatherPenalty) * 0.2;

  return Math.max(0, Math.min(100, combinedScore));
}

export async function fetchWeatherData(latitude: number, longitude: number, days: number = 30): Promise<WeatherData> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: startStr,
      end_date: endStr,
      hourly: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
      timezone: "UTC",
    });

    const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;

    if (!data.hourly) {
      throw new Error("No hourly data in Open-Meteo response");
    }

    const { temperature_2m, precipitation, weather_code, wind_speed_10m } = data.hourly;

    const temperatures = temperature_2m.filter((v) => typeof v === "number" && Number.isFinite(v));
    const precipitations = precipitation.filter((v) => typeof v === "number" && Number.isFinite(v));
    const windSpeeds = wind_speed_10m.filter((v) => typeof v === "number" && Number.isFinite(v));
    const weatherCodes = weather_code.filter((v) => typeof v === "number");

    const avgTemperatureCelsius =
      temperatures.length > 0 ? Number((temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1)) : null;
    const minTemperatureCelsius = temperatures.length > 0 ? Number(Math.min(...temperatures).toFixed(1)) : null;
    const maxTemperatureCelsius = temperatures.length > 0 ? Number(Math.max(...temperatures).toFixed(1)) : null;
    const totalPrecipitationMm =
      precipitations.length > 0 ? Number(precipitations.reduce((a, b) => a + b, 0).toFixed(1)) : null;
    const avgWindSpeedKmh =
      windSpeeds.length > 0 ? Number((windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length).toFixed(1)) : null;
    const maxWindSpeedKmh = windSpeeds.length > 0 ? Number(Math.max(...windSpeeds).toFixed(1)) : null;
    const extremeWeatherDayCount = weatherCodes.filter(isExtremeWeather).length;

    // Expected rainfall for the period
    const expectedMonthlyRainMm = 80;
    const expectedPeriodRainMm = (expectedMonthlyRainMm / 30) * days;
    const precipitationDeficitMm =
      totalPrecipitationMm !== null ? Number((Math.max(0, expectedPeriodRainMm - totalPrecipitationMm)).toFixed(1)) : null;

    const metrics: WeatherRiskMetrics = {
      avgTemperatureCelsius,
      minTemperatureCelsius,
      maxTemperatureCelsius,
      totalPrecipitationMm,
      avgWindSpeedKmh,
      maxWindSpeedKmh,
      extremeWeatherDayCount,
      precipitationDeficitMm,
      riskScore: 0,
    };

    metrics.riskScore = computeRiskScore(metrics);

    return {
      latitude,
      longitude,
      fetchedAt: new Date().toISOString(),
      period: `${days}d`,
      metrics,
      source: "open-meteo",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown weather fetch error";

    return {
      latitude,
      longitude,
      fetchedAt: new Date().toISOString(),
      period: `${days}d`,
      metrics: {
        avgTemperatureCelsius: null,
        minTemperatureCelsius: null,
        maxTemperatureCelsius: null,
        totalPrecipitationMm: null,
        avgWindSpeedKmh: null,
        maxWindSpeedKmh: null,
        extremeWeatherDayCount: 0,
        precipitationDeficitMm: null,
        riskScore: 50,
      },
      source: "open-meteo",
      warning: `Weather data fallback applied: ${message}`,
    };
  }
}

export async function fetchWeatherForField(
  latitude: number | null,
  longitude: number | null,
  bboxMinLat: number | null,
  bboxMinLon: number | null,
  bboxMaxLat: number | null,
  bboxMaxLon: number | null,
  days?: number,
): Promise<WeatherData | null> {
  let lat = latitude;
  let lon = longitude;

  if ((lat === null || lon === null) && bboxMinLat !== null && bboxMinLon !== null && bboxMaxLat !== null && bboxMaxLon !== null) {
    lat = (bboxMinLat + bboxMaxLat) / 2;
    lon = (bboxMinLon + bboxMaxLon) / 2;
  }

  if (lat === null || lon === null) {
    return null;
  }

  return fetchWeatherData(lat, lon, days);
}
