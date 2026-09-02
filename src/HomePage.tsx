import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react';

const islands = [
  { name: 'Oʻahu', slug: 'oahu', status: 'Explore now', landmark: 'Diamond Head · Lēʻahi', description: 'Current weather, rainfall, access details and trail-condition estimates.' },
  { name: 'Kauaʻi', slug: 'kauai', status: 'In development', landmark: 'Nā Pali Coast', description: 'A conditions-first catalog is being verified with official trail, access and sensor sources.' },
  { name: 'Maui', slug: 'maui', status: 'Planned', landmark: 'Keoneheʻeheʻe · Sliding Sands', description: 'Source discovery will begin after the Kauaʻi pilot.' },
  { name: 'Hawaiʻi Island', slug: 'hawaii-island', status: 'Planned', landmark: 'Hawaiʻi Volcanoes National Park', description: 'Trail and condition coverage is planned for a later phase.' }
] as const;

export function HomePage() {
  const islandAvailable = (slug: typeof islands[number]['slug']) => slug === 'oahu' || (import.meta.env.DEV && (slug === 'kauai' || slug === 'hawaii-island'));
  return <div className="app-shell gateway-shell">
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="/" aria-label="HikeIt Hawaii home"><img src="/logo.png" alt="" /><span><b>HikeIt Hawaii</b><small>Conditions-first trail planning</small></span></a>
      <nav aria-label="Primary navigation"><a href="#islands">Choose an island</a><a href="#method">About the data</a></nav>
    </div></header>
    <main>
      <section className="gateway-hero">
        <div><p className="eyebrow">HIKE WITH BETTER CONTEXT</p><h1>Choose your island.<br />Check the conditions.</h1>
          <p>Weather, rainfall, stream observations, access information and official trail sources—organized island by island without calling any trail “safe.”</p>
          <a className="primary-button" href="#islands"><MapPin size={19} /> Choose an island</a>
        </div>
        <img src="/logo.png" alt="HikeIt Hawaii mountain and waterfall logo" />
      </section>
      <section className="island-picker" id="islands" aria-labelledby="island-picker-title">
        <div className="section-heading"><div><p className="eyebrow dark">EXPLORE HAWAIʻI</p><h2 id="island-picker-title">Where are you hiking?</h2></div><p>Trail data loads only after you select an available island.</p></div>
        <div className="island-grid">{islands.map((island) => islandAvailable(island.slug)
          ? <a className={`island-card island-photo ${island.slug} available`} href={`/${island.slug}/`} key={island.slug}><span>{island.slug === 'oahu' ? island.status : 'Development preview'}</span><small className="island-landmark">{island.landmark}</small><h3>{island.name}</h3><p>{island.description}</p><b>View {island.name} {island.slug === 'oahu' ? 'conditions' : 'trail cards'} <ArrowRight size={18} /></b></a>
          : <article className={`island-card island-photo ${island.slug}`} aria-disabled="true" key={island.slug}><span>{island.status}</span><small className="island-landmark">{island.landmark}</small><h3>{island.name}</h3><p>{island.description}</p><small>Not yet publicly available</small></article>)}</div>
      </section>
      <section className="gateway-method" id="method"><CheckCircle2 /><div><h2>Conditions first, authority anchored</h2><p>HikeIt combines official trail and access records with timestamped weather, rainfall and available stream observations. Estimates are planning context—not a safety rating—and official closures always take precedence.</p></div></section>
    </main>
    <footer><img src="/logo.png" alt="" /><div><strong>HikeIt Hawaii</strong><span>Thoughtful trail planning, island by island.</span></div><nav className="footer-links" aria-label="Legal and site links"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/advertising.html">Advertising</a></nav></footer>
  </div>;
}
