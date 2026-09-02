import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, CloudRain, CloudSun, Droplets, ExternalLink,
  Footprints, Info, LocateFixed, Mail, MapPin, Moon, Search, Share2, SlidersHorizontal, Smartphone, Sun, Sunrise, Sunset, Waves, Wind, X
} from 'lucide-react';
import { api } from './api';
import { AdSlot } from './AdSlot';
import type { Difficulty, IslandForecast, TrailCondition } from './types';
import { formatOahuSunTime, isNightOnOahu, moonPhase } from './astronomy';
import { trackEvent } from './analytics';

type Feature = 'ALL' | 'WATERFALL' | 'CULTURE' | 'SCENIC' | 'STREAM';
type Area = 'ALL' | 'HONOLULU' | 'WINDWARD' | 'NORTH_SHORE' | 'CENTRAL' | 'WEST';
type Guide = { slug: string; title: string; eyebrow: string; description: string; intro: string; matches: (trail: TrailCondition) => boolean };

const areaLabels: Record<Area, string> = { ALL: 'All Oʻahu', HONOLULU: 'Honolulu', WINDWARD: 'Windward', NORTH_SHORE: 'North Shore', CENTRAL: 'Central Oʻahu', WEST: 'West Oʻahu' };
const featureLabels: Record<Feature, string> = { ALL: 'Any feature', WATERFALL: 'Waterfalls', CULTURE: 'Historic & cultural', SCENIC: 'Scenic views', STREAM: 'Streams' };
const iosBetaUrl = import.meta.env.VITE_IOS_BETA_URL?.trim();
const androidBetaUrl = import.meta.env.VITE_ANDROID_BETA_URL?.trim();

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function trailSlug(trail: Pick<TrailCondition, 'trail_name'>) {
  return normalize(trail.trail_name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function trailUrl(trail: Pick<TrailCondition, 'trail_name'> & Partial<Pick<TrailCondition, 'island_id'>>) {
  if (trail.island_id === 'kauai') return `/kauai/trails/${trailSlug(trail)}/`;
  if (trail.island_id === 'hawaii-island') return `/hawaii-island/trails/${trailSlug(trail)}/`;
  return `/trails/${trailSlug(trail)}/`;
}
function trailPageTitle(trail: Pick<TrailCondition, 'trail_name'>) {
  return `${trail.trail_name}${/trail$/i.test(trail.trail_name) ? ' Guide' : ' Trail Guide'} | HikeIt Hawaii`;
}

const guides: Guide[] = [
  { slug: 'best-oahu-waterfall-hikes', title: 'Best Oʻahu Waterfall Hikes', eyebrow: 'WATERFALL TRAILS', description: 'Compare Oʻahu waterfall hikes with current rainfall, estimated waterfall flow, mud, trail length, difficulty and access information.', intro: 'Explore waterfall routes across Oʻahu and compare the conditions that matter before you go. Waterfall flow and mud levels are weather-based estimates—not safety ratings—and can change quickly.', matches: (trail) => hasFeature(trail, 'WATERFALL') },
  { slug: 'easy-oahu-hikes', title: 'Easy Oʻahu Hikes', eyebrow: 'EASIER ROUTES', description: 'Find easier Oʻahu hikes with trail length, elevation, weather, UV, access details and estimated trail conditions.', intro: 'These routes are classified as easy in the HikeIt Hawaii trail data, but heat, rain, footing and individual ability can change the experience. Check each trail’s current details before leaving.', matches: (trail) => trail.difficulty === 'EASY' },
  { slug: 'oahu-hikes-with-ocean-views', title: 'Oʻahu Hikes With Ocean Views', eyebrow: 'COASTAL & RIDGE VIEWS', description: 'Discover Oʻahu hikes with ocean views, current weather, UV exposure, distance, elevation and official access information.', intro: 'From coastal paths to exposed ridgelines, these hikes are known for broad island and ocean views. Pay particular attention to UV, heat, wind and limited shade on exposed routes.', matches: (trail) => /ocean|coast|coastal|island view|scenic view|ridge|overlook|lookout/.test(normalize(`${trail.trail_features ?? ''} ${trail.amenities ?? ''} ${trail.trail_name}`)) },
  { slug: 'permit-required-oahu-hikes', title: 'Permit-Required Oʻahu Hikes', eyebrow: 'ACCESS PLANNING', description: 'Find Oʻahu hikes that require permits, reservations or access verification, with direct links to official access information.', intro: 'Access rules can change without notice. Use this guide to identify routes with permits, reservations or restricted access, then confirm requirements with the managing organization before visiting.', matches: (trail) => Boolean(trail.permit_url || trail.access_requirements || trail.access_status === 'RESTRICTED') },
];
const TRAIL_CACHE_KEY = 'hikeit:island:oahu:trail-summaries:v2';
function guideUrl(guide: Guide) { return `/guides/${guide.slug}/`; }

type TrailPhoto = { src: string; alt: string; caption: string };

const trailPhotoRegistry: Array<{ names: string[]; photos: TrailPhoto[] }> = [
  { names: ['Crouching Lion Trail', 'Crouching Lion Hike'], photos: [{ src: '/trails/credited/crouching-lion-kahana-bay-hikeit-hawaii.png', alt: 'Kahana Bay and the Koʻolau mountains viewed from Crouching Lion', caption: 'Kahana Bay from Crouching Lion' }] },
  { names: ['Waimea Valley Falls Walk', 'Waimea Falls Trail'], photos: [{ src: '/trails/credited/waimea-valley-waterfall-no-people-hikeit-hawaii.png', alt: 'Waimea Falls cascading into its pool in Waimea Valley', caption: 'Waimea Falls' }] },
  { names: ['Kolekole Pass Trail'], photos: [{ src: '/trails/credited/kolekole-pass-overlook-hikeit-hawaii.png', alt: 'Leeward Oʻahu viewed from Kolekole Pass at golden hour', caption: 'View from Kolekole Pass' }] },
  { names: ['Tripler Ridge Trail'], photos: [{ src: '/trails/credited/tripler-ridge-view-hikeit-hawaii.png', alt: 'Honolulu and the coast viewed from Tripler Ridge', caption: 'View from Tripler Ridge' }] },
  { names: ['Diamond Head Summit Trail'], photos: [{ src: '/trails/credited/diamond-head-waikiki-view-hikeit-hawaii.png', alt: 'Waikīkī and the south shore viewed from the Diamond Head summit trail', caption: 'Waikīkī from Lēʻahi' }] },
  { names: ['Kaʻena Point Trail'], photos: [{ src: '/trails/credited/kaena-point-coast-hikeit-hawaii.png', alt: 'Kaʻena Point coastline, native vegetation and Waiʻanae mountains', caption: 'Kaʻena Point coast' }] },
  { names: ['Lāʻie Falls Trail'], photos: [{ src: '/trails/credited/laie-falls-hikeit-hawaii.png', alt: 'Lāʻie Falls flowing into a forest pool', caption: 'Lāʻie Falls' }] },
  { names: ['Old Pali Highway Trail', 'Old Pali Road Trail'], photos: [{ src: '/trails/credited/old-pali-highway-trail-hikeit-hawaii.png', alt: 'Old Pali Highway below the misty Koʻolau mountains', caption: 'Old Pali Highway' }] },
  { names: ['Makapuʻu Point Lighthouse Trail'], photos: [{ src: '/trails/credited/makapuu-lighthouse-trail-hikeit-hawaii.png', alt: 'Windward coastline and offshore islands viewed from Makapuʻu', caption: 'Windward coast from Makapuʻu' }] },
  { names: ['Manana Trail / Waimano Falls'], photos: [{ src: '/trails/credited/waimano-falls-hikeit-hawaii.png', alt: 'Rocky pool and hanging ropes at Waimano Falls', caption: 'Waimano Falls pool' }] },
  { names: ['Lulumahu Falls Trail'], photos: [
    { src: '/trails/credited/lulumahu-trail-hikeit-hawaii.png', alt: 'Green Koʻolau mountain ridges along the Lulumahu Falls approach', caption: 'Lulumahu trail approach' },
    { src: '/trails/credited/lulumahu-falls-hikeit-hawaii.png', alt: 'Lulumahu Falls flowing down a mossy rock face', caption: 'Lulumahu Falls' },
  ] },
  { names: ['Kaiwa Ridge Trail'], photos: [{ src: '/trails/credited/lanikai-pillbox-hikeit-hawaii.png', alt: 'Lanikai and the Mokulua islands viewed from the Lanikai Pillbox trail', caption: 'Mokulua islands from Lanikai Pillbox' }] },
  { names: ['Judd Trail'], photos: [{ src: '/trails/credited/judd-trail-stream-hikeit-hawaii.png', alt: 'Stream pool and rocky cascade beside Judd Trail', caption: 'Nuʻuanu stream beside Judd Trail' }] },
];

function trailPhotos(trail: TrailCondition) {
  const names = [trail.trail_name, ...(trail.alternate_names ?? [])].map(normalize);
  return trailPhotoRegistry.find((entry) => entry.names.some((name) => names.includes(normalize(name))))?.photos ?? [];
}
function uvBand(value: number | null) {
  if (value === null) return 'Unavailable';
  if (value <= 2) return 'Low';
  if (value <= 5) return 'Moderate';
  if (value <= 7) return 'High';
  if (value <= 10) return 'Very high';
  return 'Extreme';
}
function uvTone(value: number | null) {
  if (value === null) return 'uv-unavailable';
  if (value <= 2) return 'uv-low';
  if (value <= 5) return 'uv-moderate';
  if (value <= 7) return 'uv-high';
  if (value <= 10) return 'uv-very-high';
  return 'uv-extreme';
}
function areaFor(trail: TrailCondition): Area {
  const value = normalize(`${trail.region} ${trail.start_point_description ?? ''}`);
  if (/koolaupoko|windward|kaneohe|kailua|waimanalo/.test(value)) return 'WINDWARD';
  if (/koolauloa|waialua|north shore|hauula|kaunala/.test(value)) return 'NORTH_SHORE';
  if (/wahiawa|central|pearl|waimano|manana/.test(value)) return 'CENTRAL';
  if (/waianae|waiʻanae|maili|māʻili|puʻu o hulu|puu o hulu|pink pillbox|mokuleia|kuaokala|kuaokalā|kealia|kaʻena|kaena|keawaula|keawaʻula|yokohama|peacock flats/.test(value)) return 'WEST';
  return 'HONOLULU';
}
function hasFeature(trail: TrailCondition, feature: Feature) {
  if (feature === 'ALL') return true;
  const value = normalize(`${trail.trail_name} ${trail.trail_features ?? ''} ${trail.amenities ?? ''}`);
  if (feature === 'WATERFALL') return trail.trail_type === 'WATERFALL' || /falls|waterfall/.test(value);
  if (feature === 'CULTURE') return /culture|historic|archaeolog/.test(value);
  if (feature === 'SCENIC') return /scenic|view|overlook|ridge/.test(value);
  return /stream|river|waterway/.test(value);
}
function terrainLabel(trail: TrailCondition) {
  if (trail.trail_name === 'Koko Crater Railway Trail') return 'Steep climb';
  if (trail.trail_type === 'RIDGE') return 'Ridge';
  if (trail.trail_type === 'STREAM') return 'Stream';
  if (trail.trail_type === 'WATERFALL') return 'Waterfall';
  return 'Trail';
}
function difficultyLabel(trail: TrailCondition) {
  return trail.official_difficulty ?? (trail.difficulty === 'HARD' ? 'Difficult' : trail.difficulty === 'EASY' ? 'Easy' : 'Moderate');
}

function GooglePlayMark() {
  return <svg className="google-play-mark" viewBox="0 0 40 44" aria-hidden="true">
    <path fill="#34A853" d="M3 2.7 24 22 3 41.3c-1-.8-1.6-2-1.6-3.5V6.2C1.4 4.7 2 3.5 3 2.7Z" />
    <path fill="#4285F4" d="m24 22 6.8-6.2L8.1 2.9A5.6 5.6 0 0 0 3 2.7L24 22Z" />
    <path fill="#FBBC04" d="m24 22 6.8 6.2L8.1 41.1a5.6 5.6 0 0 1-5.1.2L24 22Z" />
    <path fill="#EA4335" d="m30.8 15.8 6.1 3.5c2.1 1.2 2.1 4.2 0 5.4l-6.1 3.5L24 22l6.8-6.2Z" />
  </svg>;
}

function AppleStoreMark() {
  return <svg className="apple-store-mark" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.22.07 2.07.66 2.79.71 1.08-.22 2.11-.85 3.26-.76 1.38.11 2.42.66 3.11 1.65-2.84 1.72-2.17 5.47.44 6.52-.52 1.37-1.2 2.74-1.6 4.85ZM12.03 7.25c-.15-2.03 1.51-3.7 3.4-3.86.26 2.34-2.12 4.09-3.4 3.86Z" />
  </svg>;
}

function FacebookMark() {
  return <svg className="social-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#0866FF" />
    <path fill="#fff" d="M18.25 28V17.06h3.67l.55-4.26h-4.22v-2.72c0-1.23.34-2.07 2.11-2.07h2.25V4.2a30.1 30.1 0 0 0-3.28-.17c-3.25 0-5.47 1.98-5.47 5.62v3.14h-3.67v4.26h3.67V28h4.39Z" />
  </svg>;
}

function InstagramMark() {
  return <svg className="social-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <defs><radialGradient id="instagram-gradient" cx="30%" cy="105%" r="120%"><stop offset="0" stopColor="#FFD600" /><stop offset=".35" stopColor="#FF7A00" /><stop offset=".62" stopColor="#FF0169" /><stop offset="1" stopColor="#D300C5" /></radialGradient></defs>
    <rect width="32" height="32" rx="8" fill="url(#instagram-gradient)" />
    <rect x="7.25" y="7.25" width="17.5" height="17.5" rx="5.4" fill="none" stroke="#fff" strokeWidth="2.3" />
    <circle cx="16" cy="16" r="4.3" fill="none" stroke="#fff" strokeWidth="2.3" />
    <circle cx="22.1" cy="9.95" r="1.35" fill="#fff" />
  </svg>;
}

export function OahuApp() {
  const [trails, setTrails] = useState<TrailCondition[]>([]);
  const [routeDetail, setRouteDetail] = useState<TrailCondition | null>(null);
  const [forecast, setForecast] = useState<IslandForecast | null>(null);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [query, setQuery] = useState('');
  const [feature, setFeature] = useState<Feature>('ALL');
  const [area, setArea] = useState<Area>('ALL');
  const [difficulty, setDifficulty] = useState<'ALL' | Difficulty>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const forecastCacheKey = 'hikeit-oahu-forecast-v1';
    try {
      const cached = JSON.parse(localStorage.getItem(forecastCacheKey) ?? 'null') as { savedAt: number; data: IslandForecast } | null;
      // Paint a recent saved forecast instantly, then replace it with current data below.
      if (cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000 && cached.data.days?.length === 7) setForecast(cached.data);
    } catch { localStorage.removeItem(forecastCacheKey); }

    try {
      const cached = JSON.parse(localStorage.getItem(TRAIL_CACHE_KEY) ?? 'null') as { savedAt: number; data: TrailCondition[] } | null;
      // Trail identity and access data remain useful even when conditions are
      // older. Paint any valid saved cards immediately, then refresh their
      // live condition fields in the background below.
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        setTrails(cached.data);
        setLoading(false);
      }
    } catch { localStorage.removeItem(TRAIL_CACHE_KEY); }

    let receivedForecast = false;
    const applyForecast = (forecastData: IslandForecast) => {
      receivedForecast = true;
      setForecastError(false);
      setForecast(forecastData);
      localStorage.setItem(forecastCacheKey, JSON.stringify({ savedAt: Date.now(), data: forecastData }));
    };
    // Direct weather paints first; the backend follows independently with official NWS alert information.
    const weatherRequests = [api.fastForecast().then(applyForecast), api.oahuForecast().then(applyForecast)];
    void Promise.allSettled(weatherRequests).then(() => { if (!receivedForecast) setForecastError(true); });

    const needsCompleteCatalog = /^\/(trails|guides)\//.test(window.location.pathname);
    const trailRequest = needsCompleteCatalog
      ? api.trailSummaries().then((items) => ({ items, nextCursor: null }))
      : api.oahuTrailSummaries();
    void trailRequest.then((page) => {
      setTrails(page.items);
      setNextCursor(page.nextCursor);
      localStorage.setItem(TRAIL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: page.items }));
    })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load trail data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let hiddenAt: number | null = null;
    let refreshRunning = false;
    const refreshAfterIdle = () => {
      if (document.visibilityState !== 'visible' || hiddenAt === null || Date.now() - hiddenAt < 5 * 60 * 1000 || refreshRunning) return;
      refreshRunning = true;
      hiddenAt = null;
      // Returning to an old tab should wake the free-tier API before the
      // visitor opens a trail page, while the saved cards remain visible.
      const needsCompleteCatalog = /^\/(trails|guides)\//.test(window.location.pathname);
      const trailRequest = needsCompleteCatalog
        ? api.trailSummaries().then((items) => ({ items, nextCursor: null }))
        : api.oahuTrailSummaries();
      void trailRequest.then((page) => {
        setTrails(page.items);
        setNextCursor(page.nextCursor);
        localStorage.setItem(TRAIL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: page.items }));
      }).catch(() => undefined).finally(() => { refreshRunning = false; });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else refreshAfterIdle();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => trackEvent('search', { search_term: query.trim() }), 800);
    return () => window.clearTimeout(timer);
  }, [query]);

  const visible = useMemo(() => trails.filter((trail) => {
    const haystack = normalize(`${trail.trail_name} ${(trail.alternate_names ?? []).join(' ')} ${trail.region} ${trail.trail_features ?? ''} ${trail.amenities ?? ''}`);
    return (!query || haystack.includes(normalize(query))) && hasFeature(trail, feature)
      && (area === 'ALL' || areaFor(trail) === area) && (difficulty === 'ALL' || trail.difficulty === difficulty);
  }), [trails, query, feature, area, difficulty]);
  const filterCount = Number(feature !== 'ALL') + Number(area !== 'ALL') + Number(difficulty !== 'ALL');
  const routeSlug = pathname.match(/^\/trails\/([^/]+)\/?$/)?.[1] ?? null;
  const guideSlug = pathname.match(/^\/guides\/([^/]+)\/?$/)?.[1] ?? null;
  const guide = guideSlug ? guides.find((item) => item.slug === guideSlug) : null;
  const routeTrail = routeSlug ? trails.find((trail) => trailSlug(trail) === routeSlug) : null;
  const displayedRouteTrail = routeDetail?.trail_id === routeTrail?.trail_id ? routeDetail : routeTrail;

  const loadMoreTrails = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    void api.oahuTrailSummaries(nextCursor).then((page) => {
      setTrails((current) => {
        const merged = [...current, ...page.items.filter((item) => !current.some((existing) => existing.trail_id === item.trail_id))];
        localStorage.setItem(TRAIL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: merged }));
        return merged;
      });
      setNextCursor(page.nextCursor);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load more trails'))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    setRouteDetail(null);
    if (!routeTrail) return;
    let active = true;
    void api.oahuTrail(routeTrail.trail_id).then((detail) => { if (active) setRouteDetail(detail); }).catch(() => undefined);
    return () => { active = false; };
  }, [routeTrail?.trail_id]);

  useEffect(() => {
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    document.title = routeTrail ? trailPageTitle(routeTrail) : guide ? `${guide.title} | HikeIt Hawaii` : 'HikeIt Hawaii | Oʻahu Hiking Weather & Trail Conditions';
    if (canonical) canonical.href = routeTrail ? `https://hikeithawaii.com${trailUrl(routeTrail)}` : guide ? `https://hikeithawaii.com${guideUrl(guide)}` : 'https://hikeithawaii.com/oahu/';
    if (description) description.content = routeTrail
      ? `Plan ${routeTrail.trail_name} with its official route map, difficulty, access details, weather, UV, rainfall, and estimated mud and water-flow conditions.`
      : guide?.description ?? 'Plan Oʻahu hikes with seven-day weather, UV, sunrise and sunset, trail maps, difficulty, access information, and estimated mud and water-flow conditions.';
  }, [routeTrail, guide]);

  if (guideSlug) return <div className="app-shell">
    <SiteHeader />
    {loading ? <main className="guide-page"><div className="loading">Loading trail guide…</div></main> : guide ? <GuidePage guide={guide} trails={trails.filter(guide.matches)} daylight={forecast?.days[0]} /> : <main className="guide-page"><div className="error-state"><AlertTriangle /> Guide not found. <a href="/#guides">Browse trail guides</a></div></main>}
    <SiteFooter />
  </div>;

  if (routeSlug) return <div className="app-shell">
    <SiteHeader />
    {loading ? <main className="trail-page"><div className="loading">Loading trail guide…</div></main> : displayedRouteTrail ? <TrailDetail trail={displayedRouteTrail} allTrails={trails} daylight={forecast?.days[0]} standalone /> : <main className="trail-page"><div className="error-state"><AlertTriangle /> Trail guide not found. <a href="/#trails">Browse all trails</a></div></main>}
    <SiteFooter />
  </div>;

  return <div className="app-shell">
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#top" aria-label="HikeIt Hawaii home"><img src="/logo.png" alt="" /><span><b>HikeIt Hawaii</b><small>Oʻahu trail intelligence</small></span></a>
        <nav aria-label="Primary navigation"><a href="#forecast">Weather</a><a href="#trails">Trails</a><a href="#about">About the data</a></nav>
      </div>
    </header>
    <main id="top">
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">PLAN WITH CURRENT CONDITIONS</p><h1>Know the conditions.<br />Plan ahead.</h1>
          <p className="hero-text">Weather, water flow, mud, UV, access details and official route information for Oʻahu hikes—all in one clear view.</p>
          <a className="primary-button" href="#trails"><Footprints size={19} /> Explore {trails.length || 49} trail cards</a>
          <p className="microcopy">Observations and estimates, never a declaration that a trail is “safe.”</p></div>
        <div className="hero-brand"><img src="/logo.png" alt="HikeIt Hawaii mountain and waterfall logo" /></div>
      </section>

      <section className="app-download" aria-labelledby="app-download-title">
        <div className="app-download-icon"><Smartphone aria-hidden="true" /></div>
        <div className="app-download-copy"><p className="eyebrow dark">STAY CONNECTED</p><h2 id="app-download-title">Follow us—and take trail conditions on the go</h2><p>Follow HikeIt Hawaii for trail inspiration and updates, then use the iPhone or Android app for weather, UV guidance, trail maps, water-flow estimates and access details wherever you plan.</p>
          <nav className="download-socials" aria-label="HikeIt Hawaii social media"><a href="https://www.facebook.com/HikeitHawaii/" target="_blank" rel="noreferrer" aria-label="Follow HikeIt Hawaii on Facebook" onClick={() => trackEvent('social_click', { platform: 'facebook' })}><FacebookMark /> Facebook</a><a href="https://www.instagram.com/hikeithawaii/" target="_blank" rel="noreferrer" aria-label="Follow @hikeithawaii on Instagram" onClick={() => trackEvent('social_click', { platform: 'instagram' })}><InstagramMark /> @hikeithawaii</a><a href="mailto:hikeithawaii@gmail.com?subject=HikeIt%20Hawaii%20question" onClick={() => trackEvent('contact_click', { method: 'email' })}><Mail /> Email us</a></nav></div>
        <div className="store-actions">
          {iosBetaUrl ? <a className="store-button" href={iosBetaUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('app_download_click', { platform: 'ios' })}><AppleStoreMark /><span><small>Download on the</small><strong>App Store</strong></span></a> : <span className="store-button pending"><AppleStoreMark /><span><small>Coming soon on the</small><strong>App Store</strong></span></span>}
          {androidBetaUrl ? <a className="store-button" href={androidBetaUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('app_download_click', { platform: 'android' })}><GooglePlayMark /><span><small>GET IT ON</small><strong>Google Play</strong></span></a> : <span className="store-button pending"><GooglePlayMark /><span><small>COMING SOON ON</small><strong>Google Play</strong></span></span>}
        </div>
      </section>

      {(forecast?.alert || forecast?.heavyRainExpected) && <section className="alert-banner" role="alert"><AlertTriangle />
        <div><strong>{forecast.alert?.event ?? 'Heavy rain possible'}</strong><p>{forecast.alert?.headline ?? 'Forecast rainfall may increase flash-flood potential, stream flow, mud and unstable footing. Check official guidance before heading out.'}</p></div></section>}

      <section className="forecast-section" id="forecast"><div className="section-heading"><div><p className="eyebrow dark">OʻAHU WEATHER</p><h2>Seven-day outlook</h2></div><p>Use the forecast as one part of your plan. Conditions can vary sharply by ridge and valley.</p></div>
        {forecastError && !forecast && <div className="forecast-error"><CloudSun /><div><strong>Forecast temporarily unavailable</strong><span>Please refresh in a moment. Trail information is still available below.</span></div><button onClick={() => window.location.reload()}>Try again</button></div>}
        <div className="forecast-grid">{forecast?.days.map((day) => <article className="forecast-card" key={day.date}>
          <div className="forecast-icon">{day.rainChancePercent >= 40 ? <CloudRain /> : <CloudSun />}</div>
          <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</strong>
          <span className="temperatures">{day.highF}° <small>{day.lowF}°</small></span><span>{day.rainChancePercent}% rain</span><small className="sun-times"><span><Sunrise /> {formatOahuSunTime(day.sunrise)}</span><span><Sunset /> {formatOahuSunTime(day.sunset)}</span></small><small className={`uv-badge ${uvTone(day.uvIndex)}`}>UV {day.uvIndex} · {uvBand(day.uvIndex)}</small>
        </article>) ?? Array.from({ length: 7 }, (_, index) => <div className="forecast-card skeleton" key={index} />)}</div>
        <aside className="uv-explainer"><span><Sun /></span><div><strong>Why UV matters on the trail</strong><p>UV exposure can be intense on routes with little shade—especially Makapuʻu Lighthouse and Koko Head. A high UV index increases sunburn and heat-stress risk, so plan your timing, water, sun protection and rest breaks accordingly.</p><div className="uv-scale" aria-label="UV index scale"><i className="uv-low">0–2 <b>Low</b></i><i className="uv-moderate">3–5 <b>Moderate</b></i><i className="uv-high">6–7 <b>High</b></i><i className="uv-very-high">8–10 <b>Very high</b></i><i className="uv-extreme">11+ <b>Extreme</b></i></div></div></aside>
      </section>

      <AdSlot slot={import.meta.env.VITE_ADSENSE_FORECAST_SLOT} label="Advertisement after the Oʻahu forecast" />

      <section className="guides-section" id="guides"><div className="section-heading"><div><p className="eyebrow dark">PLAN BY EXPERIENCE</p><h2>Oʻahu hiking guides</h2></div><p>Start with a curated collection, then compare current conditions on each individual trail.</p></div><div className="guide-link-grid">{guides.map((guide) => <a className="guide-link-card" href={guideUrl(guide)} key={guide.slug}><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><b>Explore guide <ArrowLeft className="arrow" size={17} /></b></a>)}</div></section>

      <section className="trail-stories" aria-labelledby="trail-stories-title">
        <div className="story-intro"><p className="eyebrow">FROM THE ORIGINAL HIKEIT HAWAII</p><h2 id="trail-stories-title">Oʻahu beyond the numbers</h2><p>Waterfalls, ridgelines and open coast make every trail feel different. These photographs from the original HikeIt Hawaii site are a reminder to look beyond the dashboard—and plan for the terrain you will actually meet.</p></div>
        <div className="story-gallery">
          <figure className="story-photo tall"><img src="/trails/credited/lulumahu-falls-hikeit-hawaii.png" alt="Lulumahu Falls surrounded by green forest" loading="lazy" /><figcaption><b>Lulumahu Falls</b><span>Waterfall country</span></figcaption></figure>
          <figure className="story-photo"><img src="/trails/credited/lanikai-pillbox-hikeit-hawaii.png" alt="Ocean view from Lanikai Pillbox" loading="lazy" /><figcaption><b>Lanikai Pillbox</b><span>Exposed coastal views</span></figcaption></figure>
          <figure className="story-photo"><img src="/trails/credited/makapuu-lighthouse-trail-hikeit-hawaii.png" alt="Makapuʻu coastline seen from the trail" loading="lazy" /><figcaption><b>Makapuʻu</b><span>Sun, wind and wide-open coast</span></figcaption></figure>
          <figure className="story-photo"><img src="/trails/credited/old-pali-highway-trail-hikeit-hawaii.png" alt="Old Pali Road trail scenery" loading="lazy" /><figcaption><b>Old Pali Road</b><span>History in the Koʻolau</span></figcaption></figure>
        </div>
      </section>

      <section className="trails-section" id="trails"><div className="section-heading"><div><p className="eyebrow dark">EXPLORE OʻAHU</p><h2>Find your trail</h2></div><p>Search by name, region, terrain, waterfall, cultural features or difficulty.</p></div>
        <div className="trail-tools"><label className="search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trails, regions or features" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={18} /></button>}</label>
          <button className={`filter-button ${filterCount ? 'active' : ''}`} onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}><SlidersHorizontal size={18} /> Filters{filterCount ? ` (${filterCount})` : ''}</button></div>
        <div className={`filter-panel ${filtersOpen ? '' : 'mobile-hidden'}`}><FilterSelect label="Features" value={feature} onChange={(value) => { setFeature(value as Feature); trackEvent('filter_trails', { filter_type: 'feature', filter_value: value }); }} options={featureLabels} />
          <FilterSelect label="Region" value={area} onChange={(value) => { setArea(value as Area); trackEvent('filter_trails', { filter_type: 'region', filter_value: value }); }} options={areaLabels} />
          <FilterSelect label="Difficulty" value={difficulty} onChange={(value) => { setDifficulty(value as 'ALL' | Difficulty); trackEvent('filter_trails', { filter_type: 'difficulty', filter_value: value }); }} options={{ ALL: 'Any difficulty', EASY: 'Easy', MODERATE: 'Moderate', HARD: 'Hard' }} />
          <button className="text-button" onClick={() => { setFeature('ALL'); setArea('ALL'); setDifficulty('ALL'); }}>Clear filters</button></div>
        <aside className="estimate-disclosure"><Info /><p><strong>Planning estimate:</strong> Mud, water flow and trail-condition information are best estimates based on current and recent weather within the surrounding area, available stream gauges and mapped trail data. Conditions can differ along the route and change without notice.</p></aside>
        <div className="results-line"><strong>{visible.length} trail{visible.length === 1 ? '' : 's'}</strong><span>Conditions refresh from the HikeIt API</span></div>
        {error && <div className="error-state"><AlertTriangle /> {error}. Start the API or check VITE_API_URL.</div>}
        {loading ? <div className="loading">Loading trail observations…</div> : <><div className="trail-grid">{visible.slice(0, 9).map((trail) => <TrailCard trail={trail} daylight={forecast?.days[0]} key={trail.trail_id} />)}</div>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_TRAILS_SLOT} label="Advertisement within trail results" />
          <div className="trail-grid">{visible.slice(9).map((trail) => <TrailCard trail={trail} daylight={forecast?.days[0]} key={trail.trail_id} />)}</div>
          {nextCursor && <div className="load-more-wrap"><button className="primary-button" onClick={loadMoreTrails} disabled={loadingMore}>{loadingMore ? 'Loading more trails…' : 'Show more trails'}</button></div>}</>}
      </section>
      <section className="data-note" id="about"><CheckCircle2 /><div><h2>What these readings mean</h2><p>HikeIt combines official trail records, current weather, UV forecasts, rainfall and available stream sensors. Mud and water-flow readings are estimates for planning and comparison—not measurements at every point on a trail and never safety ratings. Conditions can change quickly. Always follow official alerts, closures, signs and access requirements.</p></div></section>
    </main>
    <footer><img src="/logo.png" alt="" /><div><strong>HikeIt Hawaii</strong><span>Built for thoughtful Oʻahu trail planning.</span></div><nav className="footer-links" aria-label="Legal and site links"><a href="/privacy.html">Privacy</a><button onClick={() => window.dispatchEvent(new Event('hikeit:privacy-choices'))}>Privacy choices</button><a href="/terms.html">Terms</a><a href="/advertising.html">Advertising</a><a href="#top">Back to top</a></nav></footer>
  </div>;
}

function SiteHeader() { return <header className="site-header"><div className="header-inner"><a className="brand" href="/" aria-label="HikeIt Hawaii home"><img src="/logo.png" alt="" /><span><b>HikeIt Hawaii</b><small>Oʻahu trail intelligence</small></span></a><nav aria-label="Primary navigation"><a href="/#forecast">Weather</a><a href="/#guides">Guides</a><a href="/#trails">Trails</a><a href="/#about">About the data</a></nav></div></header>; }
function SiteFooter() { return <footer><img src="/logo.png" alt="" /><div><strong>HikeIt Hawaii</strong><span>Built for thoughtful Oʻahu trail planning.</span></div><nav className="footer-links" aria-label="Legal and site links"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/#guides">Guides</a><a href="/#trails">All trails</a></nav></footer>; }

function GuidePage({ guide, trails, daylight }: { guide: Guide; trails: TrailCondition[]; daylight?: IslandForecast['days'][number] }) {
  return <main className="guide-page"><section className="guide-hero"><a href="/#guides"><ArrowLeft size={18} /> All hiking guides</a><p className="eyebrow">{guide.eyebrow}</p><h1>{guide.title}</h1><p>{guide.intro}</p><span>{trails.length} matching trail{trails.length === 1 ? '' : 's'} on Oʻahu</span></section><section className="guide-results"><aside className="estimate-disclosure"><Info /><p><strong>Planning information:</strong> Conditions are estimates based on weather, rainfall, available stream data and mapped trail information. Always check official alerts, closures and access requirements.</p></aside><div className="trail-grid">{trails.map((trail) => <TrailCard trail={trail} daylight={daylight} key={trail.trail_id} />)}</div></section></main>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Record<string, string> }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{Object.entries(options).map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>;
}

export function TrailCard({ trail, daylight }: { trail: TrailCondition; daylight?: IslandForecast['days'][number] }) {
  const night = isNightOnOahu(daylight?.sunrise, daylight?.sunset);
  const moon = moonPhase();
  const share = async () => {
    const url = `${window.location.origin}${trailUrl(trail)}`;
    const text = `${trail.trail_name} · ${trail.region} · ${trail.length_miles ?? '—'} mi\n24-hour rain: ${trail.rainfall_24h ?? '—'} in · Mud estimate: ${trail.mud_score ?? '—'}/10\nObservations and estimates—not a safety rating.\n${url}`;
    const canShare = typeof navigator.share === 'function';
    const method = canShare ? 'native' : 'clipboard';
    if (canShare) await navigator.share({ title: trail.trail_name, text, url }); else await navigator.clipboard.writeText(text);
    trackEvent('share', { method, content_type: 'trail', item_id: trail.trail_id, item_name: trail.trail_name });
  };
  return <article className="trail-card">
    {trail.official_alert && <div className="card-alert"><AlertTriangle size={16} /> Official weather alert</div>}
    {trail.access_status === 'CLOSED' && <div className="card-access closed">Official source reports this route closed</div>}
    {trail.access_status === 'RESTRICTED' && <div className="card-access">Restricted access · verify permit requirements</div>}
    <div className="card-head"><div><span className="region"><MapPin size={14} /> {trail.region}</span><h3>{trail.trail_name}</h3>{trail.alternate_names?.length > 0 && <p className="alternate-name">Also known as {trail.alternate_names.join(' · ')}</p>}{trail.managing_organization && <p className="trail-manager">Managed by {trail.managing_organization}</p>}</div><div className="card-badges"><span className={`difficulty-pill ${trail.difficulty.toLowerCase()}`}>{difficultyLabel(trail)}</span><span className="type-pill">{trail.trail_type === 'WATERFALL' ? <Waves size={15} /> : <Footprints size={15} />}{terrainLabel(trail)}</span></div></div>
    <div className="trail-facts"><span><Footprints /> <b>{trail.length_miles ?? '—'} mi</b><small>{(trail.elevation_gain_ft ?? trail.elevation_range_ft) !== null ? `↑ ${trail.elevation_gain_ft ?? trail.elevation_range_ft} ft` : 'Length'}</small></span><span><CloudRain /><b>{trail.rainfall_24h ?? '—'} in</b><small>rain · 24h</small></span>{night ? <span className="uv-fact"><Moon /><b>{moon.illumination}%</b><small>{moon.label}</small></span> : <span className={`uv-fact ${uvTone(trail.uv_index)}`}><Sun /><b>{trail.uv_index ?? '—'}</b><small>UV · {uvBand(trail.uv_index)}</small></span>}</div>
    {trail.trail_type === 'WATERFALL' && <Score label="Waterfall flow" value={trail.waterfall_flow_score} />}
    <Score label="Mud level" value={trail.mud_score} mud />
    <div className="condition-row"><span><CloudSun size={17} /> {trail.temperature_f ?? '—'}°F · {trail.weather_description ?? 'Weather unavailable'}</span><span>{trail.confidence_score ?? 0}% confidence</span></div>
    <div className="card-actions"><a className="open-button" href={trailUrl(trail)} onClick={() => trackEvent('select_content', { content_type: 'trail', item_id: trail.trail_id, item_name: trail.trail_name })}>View trail details <ArrowLeft className="arrow" size={17} /></a><button className="share-button" onClick={() => void share()} aria-label={`Share ${trail.trail_name}`}><Share2 size={17} /></button></div>
  </article>;
}

function Score({ label, value, mud = false }: { label: string; value: number | null; mud?: boolean }) {
  const percentage = Math.max(0, Math.min(100, (value ?? 0) * 10));
  return <div className="score"><div><span>{label}</span><b>{value ?? '—'}/10</b></div><div className="score-track"><i className={mud ? 'mud' : ''} style={{ width: `${percentage}%` }} /></div></div>;
}

export function TrailDetail({ trail, allTrails = [], daylight, standalone = false }: { trail: TrailCondition; allTrails?: TrailCondition[]; daylight?: IslandForecast['days'][number]; standalone?: boolean }) {
  const night = isNightOnOahu(daylight?.sunrise, daylight?.sunset);
  const moon = moonPhase();
  const photos = trailPhotos(trail);
  const matchingGuides = guides.filter((guide) => guide.matches(trail));
  const relatedTrails = allTrails.filter((candidate) => candidate.trail_id !== trail.trail_id).map((candidate) => ({
    trail: candidate,
    score: Number(candidate.region === trail.region) * 4 + Number(candidate.trail_type === trail.trail_type) * 3
      + Number(candidate.difficulty === trail.difficulty) * 2 + Number(areaFor(candidate) === areaFor(trail)),
  })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.trail.trail_name.localeCompare(b.trail.trail_name)).slice(0, 4).map(({ trail }) => trail);
  useEffect(() => {
    if (standalone) return;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [standalone]);
  const content = <article className={`detail ${standalone ? 'detail-standalone' : ''}`}>
      {standalone && <a className="detail-back-link" href={trail.island_id === 'kauai' ? '/kauai/#trails' : trail.island_id === 'hawaii-island' ? '/hawaii-island/#trails' : '/#trails'}><ArrowLeft size={18} /> Back to all trails</a>}
      <div className="detail-hero"><span>{trail.trail_type === 'WATERFALL' ? <Waves /> : <Footprints />}</span><div><p>{trail.region}</p><h2>{trail.trail_name}</h2>{trail.alternate_names?.length > 0 && <p className="detail-alias">Also known as {trail.alternate_names.join(' · ')}</p>}<span>{trail.length_miles ?? '—'} miles · {trail.official_difficulty ?? trail.difficulty.toLowerCase()}</span></div></div>
      {photos.length > 0 && <section className={`trail-photo-gallery ${photos.length > 1 ? 'multiple' : ''}`} aria-label={`${trail.trail_name} original photography`}>
        {photos.map((photo, index) => <figure key={photo.src}><img src={photo.src} alt={photo.alt} loading={index === 0 ? 'eager' : 'lazy'} /><figcaption><span>{photo.caption}</span><small>Original photography · © HikeIt Hawaii</small></figcaption></figure>)}
      </section>}
      <div className="detail-content">
        {trail.official_alert && <Notice title="Official weather alert" copy={trail.assessment_reason ?? 'Check current official weather guidance.'} danger />}
        {trail.access_status === 'RESTRICTED' && <Notice title="Check access before visiting" copy={trail.access_requirements ?? 'Review current official permit and access requirements.'} />}
        {trail.route_geojson && <section className="detail-panel"><h3>{trail.route_source?.includes('approximate digitized') ? 'Approximate trail route' : 'Official trail route'}</h3><TrailMap trail={trail} /><small>Route from {trail.route_source}. Follow current signs and official closures; never use this planning map as a substitute for on-trail navigation.</small></section>}
        {trail.island_id === 'kauai' && /Hanakāpīʻai|Kalalau/.test(trail.trail_name) && <section className="detail-panel official-brochure-map"><h3>Official Nā Pali trail map</h3><iframe title="Official DLNR Kalalau Trail brochure map" src="https://dlnr.hawaii.gov/dsp/files/2022/12/Kalalau-Trail-Brochure_2015.pdf#page=2&view=FitH" /><div><p>This State Parks map covers the complete Kēʻē–Hanakāpīʻai–Hanakoa–Kalalau route. It is an official cartographic map, not downloadable GPS geometry.</p><a className="secondary-button" href="https://dlnr.hawaii.gov/dsp/files/2022/12/Kalalau-Trail-Brochure_2015.pdf" target="_blank" rel="noreferrer"><ExternalLink size={18} /> Open official brochure</a></div></section>}
        {(trail.elevation_gain_ft !== null || trail.elevation_range_ft !== null) && <section className="detail-panel"><h3>Terrain & incline</h3><div className="detail-stats"><Stat icon={<Footprints />} value={trail.elevation_gain_ft ?? trail.elevation_range_ft} suffix=" ft" label={trail.elevation_gain_ft !== null ? 'Published elevation gain' : 'Mapped elevation range'} /><Stat icon={<Footprints />} value={trail.length_miles} suffix=" mi" label="Trail length" /></div><small>{trail.elevation_source}. Elevation range is not the same as cumulative climbing; actual effort also depends on grade, footing, heat and mud.</small></section>}
        <section className="detail-panel"><h3>{trail.trail_type === 'STREAM' || trail.trail_type === 'WATERFALL' ? 'Water & trail surface' : 'Rain & trail surface'}</h3><div className="detail-stats">{trail.streamflow_cfs !== null && <Stat icon={<Waves />} value={trail.streamflow_cfs} label="Streamflow · cfs" />}<Stat icon={<CloudRain />} value={trail.rainfall_24h} label="Rain · 24h inches" /><Stat icon={<Droplets />} value={trail.mud_score} label="Mud estimate · /10" /></div>
          {trail.trail_type === 'WATERFALL' && <Score label="Waterfall flow" value={trail.waterfall_flow_score} />}<Score label="Mud level" value={trail.mud_score} mud />
          <p className="quality"><CheckCircle2 /> {trail.confidence_score ?? 0}% data confidence · {trail.water_data_mode === 'USGS_GAGE' ? 'direct stream gage' : 'rainfall estimate'}</p></section>
        <section className="detail-panel"><h3>Current weather</h3><p className="weather-copy">{trail.weather_description ?? 'Current weather unavailable'}</p><div className="detail-stats four"><Stat icon={<CloudSun />} value={trail.temperature_f} suffix="°F" label="Temperature" /><Stat icon={<Sun />} value={trail.feels_like_f} suffix="°F" label="Feels like" /><Stat icon={<Droplets />} value={trail.humidity_percent} suffix="%" label="Humidity" /><Stat icon={<Wind />} value={trail.wind_speed_mph} label="Wind · mph" /></div>{night ? <p className="uv-note"><Moon /> {moon.label} · {moon.illumination}% illuminated</p> : <p className="uv-note"><Sun /> UV index {trail.uv_index ?? '—'} · Use sun protection and consider heat, humidity, shade, pace and hydration together.</p>}</section>
        <section className="detail-panel"><h3>Trail observations</h3><p className="summary">{trail.ai_summary?.replace(/waterfall flow/gi, 'water flow conditions') ?? 'Conditions have not yet been assessed.'}</p><p className="disclaimer">Observations and estimates—not a safety rating. Conditions vary along a trail and can change quickly.</p></section>
        {(trail.trail_features || trail.amenities || trail.managing_organization) && <section className="detail-panel"><h3>Official trail data</h3><Fact label="Managed by" value={trail.managing_organization} /><Fact label="Features" value={trail.trail_features} /><Fact label="Amenities" value={trail.amenities} /><Fact label="Mapped hazards" value={trail.mapped_hazards} /><Fact label="Start" value={trail.start_point_description} /></section>}
        {matchingGuides.length > 0 && <section className="detail-panel internal-links"><h3>Explore this trail in a guide</h3><div>{matchingGuides.map((guide) => <a href={guideUrl(guide)} key={guide.slug}><span>{guide.eyebrow}</span><b>{guide.title}</b><ArrowLeft className="arrow" size={17} /></a>)}</div></section>}
        {relatedTrails.length > 0 && <section className="detail-panel internal-links"><h3>Related {trail.island_id === 'kauai' ? 'Kauaʻi' : trail.island_id === 'hawaii-island' ? 'Hawaiʻi Island' : 'Oʻahu'} trails</h3><div>{relatedTrails.map((related) => <a href={trailUrl(related)} key={related.trail_id}><span>{related.region} · {difficultyLabel(related)}</span><b>{related.trail_name}</b><ArrowLeft className="arrow" size={17} /></a>)}</div></section>}
        <div className="detail-actions"><a className="primary-button" href={`https://www.google.com/maps/dir/?api=1&destination=${trail.latitude},${trail.longitude}&travelmode=driving`} target="_blank" rel="noreferrer" onClick={() => trackEvent('directions_click', { item_id: trail.trail_id, item_name: trail.trail_name })}><LocateFixed size={18} /> Driving directions</a>
          {trail.permit_url && <a className="secondary-button" href={trail.permit_url} target="_blank" rel="noreferrer" onClick={() => trackEvent('permit_click', { item_id: trail.trail_id, item_name: trail.trail_name })}><ExternalLink size={18} /> Permit & access details</a>}
          {trail.access_updates_url && <a className="secondary-button" href={trail.access_updates_url} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Army access announcements</a>}
          {trail.official_trail_url && <a className="secondary-button" href={trail.official_trail_url} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Official trail information</a>}</div>
      </div>
    </article>;
  return standalone ? <main className="trail-page">{content}</main> : <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label={`${trail.trail_name} details`}>{content}</div>;
}

function Notice({ title, copy, danger = false }: { title: string; copy: string; danger?: boolean }) { return <div className={`notice ${danger ? 'danger' : ''}`}><AlertTriangle /><div><strong>{title}</strong><p>{copy}</p></div></div>; }
function Stat({ icon, value, suffix = '', label }: { icon: React.ReactNode; value: number | null; suffix?: string; label: string }) { return <div className="stat">{icon}<b>{value ?? '—'}{value !== null ? suffix : ''}</b><small>{label}</small></div>; }
function Fact({ label, value }: { label: string; value: string | null }) { return value ? <div className="fact"><b>{label}</b><span>{value}</span></div> : null; }
function TrailMap({ trail }: { trail: TrailCondition }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const approximate = trail.route_source?.includes('approximate digitized') ?? false;

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const lines = (trail.route_geojson?.coordinates ?? []).map((line) =>
      line.map(([longitude, latitude]) => L.latLng(latitude, longitude)),
    );
    const routePoints = lines.flat();

    lines.forEach((line) => L.polyline(line, {
      color: '#123f32',
      weight: 8,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map));
    lines.forEach((line) => L.polyline(line, {
      color: '#58c7dc',
      weight: 3,
      opacity: 1,
      dashArray: approximate ? '7 7' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map));

    if (routePoints.length > 0) {
      const start = routePoints[0];
      L.circleMarker(start, { radius: 7, color: '#fff', weight: 3, fillColor: '#247ba0', fillOpacity: 1 })
        .bindTooltip('Route start').addTo(map);
      map.fitBounds(L.latLngBounds(routePoints), { padding: [34, 34], maxZoom: 16 });
    }

    requestAnimationFrame(() => map.invalidateSize());
    return () => { map.remove(); };
  }, [trail, approximate]);

  return <div className="route-map">
    <div ref={mapElement} className="route-leaflet" role="img" aria-label={`Interactive map for ${trail.trail_name}`} />
    <div className={`route-legend ${approximate ? 'approximate' : ''}`}><i /> {approximate ? 'Approximate derived route' : 'Official route overlay'}</div>
  </div>;
}
