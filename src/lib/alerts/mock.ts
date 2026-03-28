import type { WeatherAlertItem } from "@/types/alert";

type FieldSeed = {
  id: string;
  name: string;
  location: string;
  zone: string;
  latitude?: number | null;
  longitude?: number | null;
};

const WEATHER_MESSAGES = [
  "Probabilidad alta de tormenta electrica en la ventana de las proximas 6 horas.",
  "Se detecta frente frio con caida abrupta de temperatura para esta noche.",
  "Rafagas sostenidas por encima del umbral operativo recomendado para maquinaria.",
  "Evento de precipitacion intensa con posible anegamiento parcial del lote.",
] as const;

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function seeded(seed: number, min: number, max: number) {
  const value = Math.sin(seed) * 10_000;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function toFieldSeeds(fields: FieldSeed[]) {
  if (fields.length > 0) {
    return fields;
  }

  return [
    {
      id: "demo-norte",
      name: "Zona Norte",
      location: "Area de monitoreo norte",
      zone: "Norte",
      latitude: -34.58,
      longitude: -58.44,
    },
    {
      id: "demo-sur",
      name: "Zona Sur",
      location: "Area de monitoreo sur",
      zone: "Sur",
      latitude: -34.71,
      longitude: -58.33,
    },
  ];
}

export function buildMockWeatherAlerts(fields: FieldSeed[]): WeatherAlertItem[] {
  const seeds = toFieldSeeds(fields);

  const alerts = seeds.slice(0, 4).map((field, index): WeatherAlertItem => {
    const seedBase = hashString(`${field.id}-${field.name}-${index}`);
    const rainfallMm = Number(seeded(seedBase + 3, 9, 68).toFixed(1));
    const windKmh = Number(seeded(seedBase + 7, 18, 74).toFixed(0));
    const temperatureDrop = Number(seeded(seedBase + 11, 2, 12).toFixed(1));
    const pressureHpa = Number(seeded(seedBase + 17, 982, 1014).toFixed(1));
    const relevanceScore = Math.round(seeded(seedBase + 21, 52, 95));
    const priorityScore = Math.round(seeded(seedBase + 29, 2, 9));

    return {
      id: `mock-${field.id}-${index}`,
      relevanceScore,
      priorityScore,
      location: field.location || field.zone || "Sin ubicacion",
      latitude: field.latitude ?? null,
      longitude: field.longitude ?? null,
      description: WEATHER_MESSAGES[seedBase % WEATHER_MESSAGES.length],
      extractedVariables: {
        rainfallMm,
        windKmh,
        temperatureDrop,
        pressureHpa,
        zone: field.zone,
      } as Record<string, unknown>,
      affectedFields: [
        {
          id: field.id,
          name: field.name,
        },
      ],
      issuedAt: new Date(Date.now() - index * 45 * 60 * 1000).toISOString(),
    };
  });

  if (seeds.length >= 2) {
    alerts.unshift({
      id: "mock-regional-shift",
      relevanceScore: 88,
      priorityScore: 7,
      location: "Cobertura regional",
      latitude: null,
      longitude: null,
      description: "Persistencia de inestabilidad regional con riesgo de tormentas aisladas.",
      extractedVariables: {
        confidence: 0.81,
        eventWindowHours: 8,
        rainfallRangeMm: [18, 45],
      } as Record<string, unknown>,
      affectedFields: seeds.slice(0, 3).map((field) => ({
        id: field.id,
        name: field.name,
      })),
      issuedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    });
  }

  return alerts;
}
