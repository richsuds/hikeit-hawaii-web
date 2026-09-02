import type { IslandForecast, TrailCondition, TrailSummaryPage } from './types';

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:4000';
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`Could not load HikeIt data (${response.status})`);
  return response.json() as Promise<T>;
}

const weatherDescriptions = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Cloudy or foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Wintry precipitation';
  if (code <= 82) return 'Rain showers';
  return 'Thunderstorms';
};

async function getFastForecast(): Promise<IslandForecast> {
    // This public source is intentionally called directly so a sleeping free-tier API cannot delay first paint.
    const params = new URLSearchParams({
      latitude: '21.4389', longitude: '-157.9653', timezone: 'Pacific/Honolulu', forecast_days: '7',
      temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Could not load weather (${response.status})`);
    const { daily } = await response.json() as { daily: Record<string, Array<string | number>> };
    const days = (daily.time as string[]).map((date, index) => ({
      date,
      weatherCode: Number(daily.weather_code[index] ?? 0),
      description: weatherDescriptions(Number(daily.weather_code[index] ?? 0)),
      highF: Math.round(Number(daily.temperature_2m_max[index] ?? 0)),
      lowF: Math.round(Number(daily.temperature_2m_min[index] ?? 0)),
      rainfallInches: Number(Number(daily.precipitation_sum[index] ?? 0).toFixed(2)),
      rainChancePercent: Math.round(Number(daily.precipitation_probability_max[index] ?? 0)),
      uvIndex: Number(Number(daily.uv_index_max[index] ?? 0).toFixed(1)),
      windMph: Math.round(Number(daily.wind_speed_10m_max[index] ?? 0)),
      sunrise: String(daily.sunrise[index] ?? ''),
      sunset: String(daily.sunset[index] ?? '')
    }));
    const heavyRainExpected = days.slice(0, 2).some((day) => day.rainfallInches >= .75
      || (day.rainfallInches >= .4 && day.rainChancePercent >= 80) || day.weatherCode >= 95);
    return { generatedAt: new Date().toISOString(), days, alert: null, heavyRainExpected };
}
export const api = {
  trails: () => get<TrailCondition[]>('/api/trail-summaries'),
  trailSummaries: async () => {
    return get<TrailCondition[]>('/api/trail-summaries');
  },
  forecast: () => get<IslandForecast>('/api/forecast'),
  fastForecast: getFastForecast,
  trail: (id: string) => get<TrailCondition>(`/api/trails/${encodeURIComponent(id)}`)
  ,oahuTrailSummaries: (cursor?: string) => get<TrailSummaryPage>(`/api/islands/oahu/trail-summaries?limit=24${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
  ,oahuForecast: () => get<IslandForecast>('/api/islands/oahu/forecast')
  ,oahuTrail: (id: string) => get<TrailCondition>(`/api/islands/oahu/trails/${encodeURIComponent(id)}`)
};
