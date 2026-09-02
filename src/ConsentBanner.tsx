import { useEffect, useState } from 'react';
import { applyConsent, savedConsent, type ConsentChoice } from './analytics';

export function ConsentBanner() {
  const [open, setOpen] = useState(() => savedConsent() === null);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener('hikeit:privacy-choices', reopen);
    return () => window.removeEventListener('hikeit:privacy-choices', reopen);
  }, []);

  const choose = (choice: ConsentChoice) => { applyConsent(choice); setOpen(false); };
  if (!open) return null;

  return <aside className="consent-banner" aria-label="Privacy choices">
    <div><strong>Your privacy choices</strong><p>With your permission, HikeIt Hawaii uses Google Analytics to understand which trail information is useful and Google services to support advertising. Choosing necessary only keeps optional tracking off.</p><a href="/privacy.html">Read our Privacy Policy</a></div>
    <div className="consent-actions"><button className="consent-necessary" onClick={() => choose('necessary')}>Necessary only</button><button className="consent-accept" onClick={() => choose('accepted')}>Accept analytics</button></div>
  </aside>;
}
