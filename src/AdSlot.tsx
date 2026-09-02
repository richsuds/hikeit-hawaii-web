import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID?.trim() || 'ca-pub-9195975174559381';

export function AdSlot({ slot, label }: { slot: string | undefined; label: string }) {
  useEffect(() => {
    if (!publisherId || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn('AdSense slot could not initialize', error);
    }
  }, [slot]);

  if (!publisherId || !slot) return null;

  return <aside className="ad-placement" aria-label={label}>
    <span>Advertisement</span>
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={publisherId}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </aside>;
}
