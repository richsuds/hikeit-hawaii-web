export type ConsentChoice = 'accepted' | 'necessary';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
  }
}

const CONSENT_KEY = 'hikeit-tracking-consent-v1';
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID?.trim() || 'ca-pub-9195975174559381';

export function savedConsent(): ConsentChoice | null {
  const value = localStorage.getItem(CONSENT_KEY);
  return value === 'accepted' || value === 'necessary' ? value : null;
}

function addScript(id: string, src: string, crossOrigin = false) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  if (crossOrigin) script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function applyConsent(choice: ConsentChoice) {
  localStorage.setItem(CONSENT_KEY, choice);
  if (choice !== 'accepted') {
    window.gtag?.('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    return;
  }

  if (measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
    window.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: true });
    addScript('hikeit-google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  }

  if (publisherId) addScript('hikeit-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`, true);
}

export function trackEvent(name: string, parameters: Record<string, string | number | boolean | null | undefined> = {}) {
  if (savedConsent() !== 'accepted') return;
  window.gtag?.('event', name, parameters);
}

export function initializeSavedConsent() {
  const choice = savedConsent();
  if (choice) applyConsent(choice);
}
