import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { TrailCard, TrailDetail, trailSlug } from './App';
import type { Difficulty, TrailCondition } from './types';
import shadowCatalog from '../data/generated/hawaii-island/hawaii-island-shadow-catalog.json';

type ShadowRecord = {
  trail_name: string; gis_names: string[]; official_trail_number: string | null; managing_authority: string;
  shadow_access_status: TrailCondition['access_status']; in_initial_pilot: boolean;
  official_facts: { district?: string; length_miles?: number | null; elevation_range_ft?: number | null; difficulty?: string; start_access?: string | null; start_point?: string | null; end_point?: string | null; climate?: string | null; features?: string | null; amenities?: string | null; hazards?: string | null; comments?: string | null; };
  route_geojson: TrailCondition['route_geojson'];
};

function difficulty(value = ''): Difficulty {
  if (/easy/i.test(value)) return 'EASY';
  if (/difficult|strenuous/i.test(value)) return 'HARD';
  return 'MODERATE';
}

function mappedMiles(route: TrailCondition['route_geojson']) {
  if (!route) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  let miles = 0;
  for (const line of route.coordinates) {
    for (let index = 1; index < line.length; index += 1) {
      const [lon1, lat1] = line[index - 1];
      const [lon2, lat2] = line[index];
      const dLat = radians(lat2 - lat1);
      const dLon = radians(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
      miles += 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }
  return Number(miles.toFixed(miles < 1 ? 2 : 1));
}

const trails: TrailCondition[] = (shadowCatalog.records as unknown as ShadowRecord[]).filter((record) => record.route_geojson).map((record) => {
  const firstPoint = record.route_geojson?.coordinates[0]?.[0];
  const approximateLength = mappedMiles(record.route_geojson);
  const npsManaged = record.managing_authority.startsWith('National Park');
  const type = /stream/i.test(record.official_facts.features ?? '') ? 'STREAM' : /ridge|cone|crater/i.test(`${record.trail_name} ${record.official_facts.features ?? ''}`) ? 'RIDGE' : 'STANDARD';
  return {
    trail_id: `hawaii-island-${record.official_trail_number ?? trailSlug({ trail_name: record.trail_name })}`,
    island_id: 'hawaii-island', trail_name: record.trail_name, alternate_names: record.gis_names.filter((name) => name !== record.trail_name),
    region: record.official_facts.district ?? 'Hawaiʻi Volcanoes National Park', managing_organization: record.managing_authority,
    latitude: firstPoint?.[1] ?? 19.41, longitude: firstPoint?.[0] ?? -155.28,
    difficulty: difficulty(record.official_facts.difficulty), official_difficulty: record.official_facts.difficulty ?? null,
    length_miles: approximateLength, elevation_gain_ft: null, elevation_range_ft: record.official_facts.elevation_range_ft ?? null,
    elevation_source: record.route_geojson ? `Approximate mapped length calculated from ${npsManaged ? 'NPS Public Trails GIS' : 'Nā Ala Hele GIS'} linework` : null, trail_type: type, water_data_mode: 'RAINFALL_ESTIMATE', access_status: record.shadow_access_status,
    official_trail_url: npsManaged ? 'https://www.nps.gov/havo/planyourvisit/hiking-trails.htm' : 'https://dlnr.hawaii.gov/recreation/nah/hawaii/',
    access_requirements: 'Verify current route, road, district and volcanic-area closures with the managing agency before visiting.', permit_url: null, access_updates_url: null,
    streamflow_cfs: null, gage_height_ft: null, rainfall_24h: null, mud_score: null, waterfall_flow_score: null,
    ai_summary: 'Live Hawaiʻi Island weather, volcano, air-quality and access observations have not yet completed shadow validation.', observed_at: null,
    confidence_score: null, official_alert: null, is_stale: null, assessment_reason: 'Hawaiʻi Island condition context has not been approved for public release.',
    temperature_f: null, feels_like_f: null, humidity_percent: null, wind_speed_mph: null, weather_description: null, uv_index: null, weather_observed_at: null,
    official_trail_number: record.official_trail_number, start_access: record.official_facts.start_access ?? null, amenities: record.official_facts.amenities ?? null,
    climate: record.official_facts.climate ?? null, trail_features: record.official_facts.features ?? null, mapped_hazards: record.official_facts.hazards ?? null,
    official_comments: record.official_facts.comments ?? null, start_point_description: record.official_facts.start_point ?? null, end_point_description: record.official_facts.end_point ?? null,
    route_source: record.route_geojson ? (npsManaged ? 'National Park Service Public Trails GIS' : 'State of Hawaiʻi Nā Ala Hele GIS') : null,
    route_source_date: record.route_geojson ? (npsManaged ? 'NPS snapshot September 2, 2026' : 'October 2022') : null, route_geojson: record.route_geojson,
  };
});

export function HawaiiIslandPreviewPage() {
  const routeSlug = window.location.pathname.match(/^\/hawaii-island\/trails\/([^/]+)\/?$/)?.[1];
  const selectedTrail = routeSlug ? trails.find((trail) => trailSlug(trail) === routeSlug) : null;
  return <div className="app-shell hawaii-island-preview-shell">
    <header className="site-header"><div className="header-inner"><a className="brand" href="/"><img src="/logo.png" alt="" /><span><b>HikeIt Hawaii</b><small>Hawaiʻi Island shadow preview</small></span></a><nav><a href="/">Island home</a><a href="/hawaii-island/#trails">Trails</a></nav></div></header>
    {routeSlug ? selectedTrail ? <><aside className="kauai-dev-ribbon">Development preview · volcano, vog and live condition fields intentionally unavailable</aside><TrailDetail trail={selectedTrail} allTrails={trails} standalone /></> : <main className="trail-page"><div className="error-state"><AlertTriangle /> Trail guide not found. <a href="/hawaii-island/#trails">Browse trails</a></div></main> : <main>
      <section className="hawaii-island-preview-hero"><a href="/"><ArrowLeft size={18} /> Back to islands</a><p className="eyebrow">DEVELOPMENT PREVIEW · NOT PUBLIC DATA</p><h1>Hawaiʻi Island trail cards</h1><p>A broader map-backed inventory from Nā Ala Hele and the National Park Service. Volcano activity, vog and SO₂, elevation-aware weather, rainfall, access and closure context remain disabled during source reconciliation.</p><div className="preview-health"><ShieldCheck /><span><b>Expanded shadow catalog</b>{trails.length} map-backed routes · no production connection</span></div></section>
      <section className="kauai-preview-content" id="trails"><aside className="preview-disclosure"><AlertTriangle /><p><strong>Verification preview:</strong> Every route defaults to verify. Inclusion here confirms an authoritative identity and map line—not that the route is currently open, maintained, or suitable for a day hike.</p></aside><div className="preview-results"><div><p className="eyebrow dark">AUTHORITATIVE INVENTORY</p><h2>{trails.length} Hawaiʻi Island routes</h2></div><span>Nā Ala Hele + NPS GIS · September 2, 2026</span></div><div className="trail-grid">{trails.map((trail) => <TrailCard trail={trail} key={trail.trail_id} />)}</div></section>
    </main>}
  </div>;
}
