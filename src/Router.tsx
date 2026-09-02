import { lazy, Suspense } from 'react';
import { HomePage } from './HomePage';

const OahuApp = lazy(() => import('./App').then((module) => ({ default: module.OahuApp })));
const KauaiPreviewPage = lazy(() => import('./KauaiPreviewPage').then((module) => ({ default: module.KauaiPreviewPage })));
const HawaiiIslandPreviewPage = lazy(() => import('./HawaiiIslandPreviewPage').then((module) => ({ default: module.HawaiiIslandPreviewPage })));

export function Router() {
  const path = window.location.pathname;
  if (import.meta.env.DEV && (path === '/kauai' || path.startsWith('/kauai/'))) return <Suspense fallback={<main className="route-loading"><img src="/logo.png" alt="" /><p>Loading Kauaʻi preview…</p></main>}><KauaiPreviewPage /></Suspense>;
  if (import.meta.env.DEV && (path === '/hawaii-island' || path.startsWith('/hawaii-island/'))) return <Suspense fallback={<main className="route-loading"><img src="/logo.png" alt="" /><p>Loading Hawaiʻi Island preview…</p></main>}><HawaiiIslandPreviewPage /></Suspense>;
  const isOahuRoute = path === '/oahu' || path.startsWith('/oahu/') || path.startsWith('/trails/') || path.startsWith('/guides/');
  if (!isOahuRoute) return <HomePage />;
  return <Suspense fallback={<main className="route-loading"><img src="/logo.png" alt="" /><p>Loading Oʻahu trail conditions…</p></main>}><OahuApp /></Suspense>;
}
