export type Difficulty = 'EASY' | 'MODERATE' | 'HARD';
export interface TrailCondition {
  trail_id: string; island_id: 'oahu' | 'kauai' | 'maui' | 'hawaii-island'; trail_name: string; alternate_names: string[]; region: string; managing_organization: string | null; latitude: number; longitude: number;
  difficulty: Difficulty; official_difficulty: string | null; length_miles: number | null;
  elevation_gain_ft: number | null; elevation_range_ft: number | null; elevation_source: string | null;
  trail_type: 'WATERFALL' | 'STREAM' | 'RIDGE' | 'STANDARD'; water_data_mode: 'USGS_GAGE' | 'RAINFALL_ESTIMATE';
  access_status: 'OPEN' | 'RESTRICTED' | 'CLOSED' | 'VERIFY'; official_trail_url: string | null;
  access_requirements: string | null; permit_url: string | null; access_updates_url: string | null;
  streamflow_cfs: number | null; gage_height_ft: number | null; rainfall_24h: number | null;
  mud_score: number | null; waterfall_flow_score: number | null; ai_summary: string | null; observed_at: string | null;
  confidence_score: number | null; official_alert: boolean | null; is_stale: boolean | null; assessment_reason: string | null;
  temperature_f: number | null; feels_like_f: number | null; humidity_percent: number | null; wind_speed_mph: number | null;
  weather_description: string | null; uv_index: number | null; weather_observed_at: string | null;
  official_trail_number: string | null; start_access: string | null; amenities: string | null; climate: string | null;
  trail_features: string | null; mapped_hazards: string | null; official_comments: string | null;
  start_point_description: string | null; end_point_description: string | null; route_source: string | null; route_source_date: string | null;
  route_geojson: { type: 'MultiLineString'; coordinates: Array<Array<[number, number]>> } | null;
}
export interface TrailSummaryPage {
  items: TrailCondition[];
  nextCursor: string | null;
  generatedAt: string;
}
export interface IslandForecast {
  generatedAt: string;
  days: Array<{ date: string; description: string; highF: number; lowF: number; rainChancePercent: number; uvIndex: number; windMph: number; sunrise: string; sunset: string }>;
  alert: null | { event: string; headline: string; severity: string; instruction: string | null };
  heavyRainExpected: boolean;
}
