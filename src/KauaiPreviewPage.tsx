import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { TrailCard, TrailDetail, trailSlug } from './App';
import type { Difficulty, TrailCondition } from './types';
import shadowCatalog from '../data/generated/kauai/kauai-shadow-catalog.json';

type ShadowRecord = {
  trail_name: string; gis_names: string[]; official_trail_number: string | null;
  managing_authority: string; shadow_access_status: TrailCondition['access_status']; in_initial_pilot: boolean;
  official_facts: { district?: string; length_miles?: number | null; length_miles_one_way?: number | null; elevation_range_ft?: number | null; difficulty?: string; start_access?: string | null; start_point?: string | null; end_point?: string | null; climate?: string | null; features?: string | null; amenities?: string | null; hazards?: string | null; comments?: string | null; };
  route_geojson: TrailCondition['route_geojson'];
};

function difficulty(value = ''): Difficulty {
  if (/easy/i.test(value)) return 'EASY';
  if (/difficult|strenuous/i.test(value)) return 'HARD';
  return 'MODERATE';
}

const trails: TrailCondition[] = (shadowCatalog.records as unknown as ShadowRecord[]).map((record) => {
  const firstPoint = record.route_geojson?.coordinates[0]?.[0];
  const type = /stream/i.test(record.official_facts.features ?? '') ? 'STREAM' : /ridge|cliff/i.test(record.official_facts.features ?? '') ? 'RIDGE' : 'STANDARD';
  return {
    trail_id: `kauai-${record.official_trail_number ?? trailSlug({ trail_name: record.trail_name })}`,
    island_id: 'kauai', trail_name: record.trail_name, alternate_names: record.gis_names.filter((name) => name !== record.trail_name),
    region: record.official_facts.district ?? (/Hanakāpīʻai|Kalalau/.test(record.trail_name) ? 'Nā Pali Coast' : 'Kauaʻi'), managing_organization: record.managing_authority,
    latitude: firstPoint?.[1] ?? 22.05, longitude: firstPoint?.[0] ?? -159.5,
    difficulty: difficulty(record.official_facts.difficulty), official_difficulty: record.official_facts.difficulty ?? null,
    length_miles: record.official_facts.length_miles ?? record.official_facts.length_miles_one_way ?? null, elevation_gain_ft: null, elevation_range_ft: record.official_facts.elevation_range_ft ?? null,
    elevation_source: 'Official Nā Ala Hele GIS record', trail_type: type, water_data_mode: 'RAINFALL_ESTIMATE', access_status: record.shadow_access_status,
    official_trail_url: 'https://hawaiitrails.ehawaii.gov/trails/', access_requirements: 'Verify current access, closures, and permit requirements with the managing agency before visiting.',
    permit_url: null, access_updates_url: null, streamflow_cfs: null, gage_height_ft: null, rainfall_24h: null, mud_score: null,
    waterfall_flow_score: null, ai_summary: 'Live Kauaʻi conditions are still being validated in shadow mode. Official route and trail facts are available for planning.',
    observed_at: null, confidence_score: null, official_alert: null, is_stale: null, assessment_reason: 'Kauaʻi condition scoring has not been approved for public release.',
    temperature_f: null, feels_like_f: null, humidity_percent: null, wind_speed_mph: null, weather_description: null, uv_index: null, weather_observed_at: null,
    official_trail_number: record.official_trail_number, start_access: record.official_facts.start_access ?? null, amenities: record.official_facts.amenities ?? null,
    climate: record.official_facts.climate ?? null, trail_features: record.official_facts.features ?? null, mapped_hazards: record.official_facts.hazards ?? null,
    official_comments: record.official_facts.comments ?? null, start_point_description: record.official_facts.start_point ?? null, end_point_description: record.official_facts.end_point ?? null,
    route_source: record.route_geojson ? 'State of Hawaiʻi Nā Ala Hele GIS' : null,
    route_source_date: record.route_geojson ? 'October 2022' : null, route_geojson: record.route_geojson,
  };
});

export function KauaiPreviewPage() {
  const routeSlug = window.location.pathname.match(/^\/kauai\/trails\/([^/]+)\/?$/)?.[1];
  const selectedTrail = routeSlug ? trails.find((trail) => trailSlug(trail) === routeSlug) : null;
  const naPaliTrails = trails.filter((trail) => /Hanakāpīʻai|Kalalau/.test(trail.trail_name));
  const otherTrails = trails.filter((trail) => !naPaliTrails.includes(trail));
  return <div className="app-shell kauai-preview-shell">
    <header className="site-header"><div className="header-inner"><a className="brand" href="/"><img src="/logo.png" alt="" /><span><b>HikeIt Hawaii</b><small>Kauaʻi shadow preview</small></span></a><nav><a href="/">Island home</a><a href="/kauai/#trails">Trails</a></nav></div></header>
    {routeSlug ? selectedTrail ? <><aside className="kauai-dev-ribbon">Development preview · live condition fields intentionally unavailable</aside><TrailDetail trail={selectedTrail} allTrails={trails} standalone /></> : <main className="trail-page"><div className="error-state"><AlertTriangle /> Trail guide not found. <a href="/kauai/#trails">Browse Kauaʻi trails</a></div></main> : <main>
      <section className="kauai-preview-hero"><a href="/"><ArrowLeft size={18} /> Back to islands</a><p className="eyebrow">DEVELOPMENT PREVIEW · NOT PUBLIC DATA</p><h1>Kauaʻi trail cards</h1><p>The original HikeIt Hawaii card and trail-detail experience, now using the full reconciled Kauaʻi shadow catalog. Route maps and official trail facts are available; live condition scores remain disabled during validation.</p><div className="preview-health"><ShieldCheck /><span><b>Shadow catalog loaded</b>Official sources responding · no production connection</span></div></section>
      <section className="kauai-preview-content" id="trails"><aside className="preview-disclosure"><AlertTriangle /><p><strong>Verification preview:</strong> Access defaults to verify, restricted, or closed according to the reconciled source record. These cards do not declare a trail open or safe. Blank condition fields are intentional until the data plan is approved.</p></aside>
        <section className="trail-collection na-pali-collection" aria-labelledby="na-pali-title"><div className="collection-heading"><div><p className="eyebrow dark">FEATURED REGION</p><h2 id="na-pali-title">Nā Pali Coast</h2></div><p>Plan each section separately. Hāʻena entry, parking or shuttle arrangements apply to the day route; travel beyond Hanakāpīʻai has additional permit requirements.</p></div><div className="trail-grid">{naPaliTrails.map((trail) => <TrailCard trail={trail} key={trail.trail_id} />)}</div></section>
        <div className="preview-results all-kauai-heading"><div><p className="eyebrow dark">FULL SHADOW CATALOG</p><h2>More Kauaʻi routes</h2></div><span>{trails.length} routes total · Shadow catalog · August 30, 2026</span></div><div className="trail-grid">{otherTrails.map((trail) => <TrailCard trail={trail} key={trail.trail_id} />)}</div>
      </section>
    </main>}
  </div>;
}
