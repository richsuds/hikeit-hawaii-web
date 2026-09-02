import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const homepage = await readFile(resolve(dist, 'index.html'), 'utf8');
await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'));

const oahuTitle = 'HikeIt Hawaii | Oʻahu Hiking Weather & Trail Conditions';
const oahuDescription = 'Plan Oʻahu hikes with weather, UV, official access information, trail maps, and estimated mud and water-flow conditions.';
const oahuPage = homepage
  .replace(/<title>.*?<\/title>/, `<title>${oahuTitle}</title>`)
  .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${oahuDescription}" />`)
  .replace(/<link rel="canonical" href="[^"]*" \/>/, '<link rel="canonical" href="https://hikeithawaii.com/oahu/" />')
  .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${oahuTitle}" />`)
  .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${oahuDescription}" />`)
  .replace(/<meta property="og:url" content="[^"]*" \/>/, '<meta property="og:url" content="https://hikeithawaii.com/oahu/" />')
  .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${oahuTitle}" />`)
  .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${oahuDescription}" />`);
await mkdir(resolve(dist, 'oahu'), { recursive: true });
await writeFile(resolve(dist, 'oahu', 'index.html'), oahuPage);

const apiUrl = process.env.VITE_API_URL?.replace(/\/$/, '');
if (!apiUrl) {
  console.warn('VITE_API_URL is not set; generated only the GitHub Pages route fallback.');
  process.exit(0);
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slug = (name) => normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const guides = [
  { slug: 'best-oahu-waterfall-hikes', title: 'Best Oʻahu Waterfall Hikes', description: 'Compare Oʻahu waterfall hikes with current rainfall, estimated waterfall flow, mud, trail length, difficulty and access information.' },
  { slug: 'easy-oahu-hikes', title: 'Easy Oʻahu Hikes', description: 'Find easier Oʻahu hikes with trail length, elevation, weather, UV, access details and estimated trail conditions.' },
  { slug: 'oahu-hikes-with-ocean-views', title: 'Oʻahu Hikes With Ocean Views', description: 'Discover Oʻahu hikes with ocean views, current weather, UV exposure, distance, elevation and official access information.' },
  { slug: 'permit-required-oahu-hikes', title: 'Permit-Required Oʻahu Hikes', description: 'Find Oʻahu hikes that require permits, reservations or access verification, with direct links to official access information.' },
];
const matchesGuide = (guideSlug, trail) => {
  const text = normalize(`${trail.trail_name} ${trail.trail_features ?? ''} ${trail.amenities ?? ''}`);
  if (guideSlug === 'best-oahu-waterfall-hikes') return trail.trail_type === 'WATERFALL' || /falls|waterfall/.test(text);
  if (guideSlug === 'easy-oahu-hikes') return trail.difficulty === 'EASY';
  if (guideSlug === 'oahu-hikes-with-ocean-views') return /ocean|coast|coastal|island view|scenic view|ridge|overlook|lookout/.test(text);
  return Boolean(trail.permit_url || trail.access_requirements || trail.access_status === 'RESTRICTED');
};

try {
  const response = await fetch(`${apiUrl}/api/trail-summaries`);
  if (!response.ok) throw new Error(`trail API returned ${response.status}`);
  const trails = await response.json();
  const sitemapUrls = [
    ['https://hikeithawaii.com/', 'daily', '1.0'],
    ['https://hikeithawaii.com/oahu/', 'daily', '1.0'],
    ...guides.map((guide) => [`https://hikeithawaii.com/guides/${guide.slug}/`, 'weekly', '0.9']),
    ...trails.map((trail) => [`https://hikeithawaii.com/trails/${slug(trail.trail_name)}/`, 'daily', '0.8']),
    ['https://hikeithawaii.com/privacy.html', 'monthly', '0.3'],
    ['https://hikeithawaii.com/terms.html', 'monthly', '0.3'],
    ['https://hikeithawaii.com/advertising.html', 'monthly', '0.2']
  ];

  for (const trail of trails) {
    const trailSlug = slug(trail.trail_name);
    const url = `https://hikeithawaii.com/trails/${trailSlug}/`;
    const title = `${trail.trail_name}${/trail$/i.test(trail.trail_name) ? ' Guide' : ' Trail Guide'} | HikeIt Hawaii`;
    const description = `Plan ${trail.trail_name} with its official route map, difficulty, access details, weather, UV, rainfall, and estimated mud and water-flow conditions.`;
    const structuredData = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'TouristAttraction', name: trail.trail_name,
      alternateName: trail.alternate_names ?? [], description, url,
      address: { '@type': 'PostalAddress', addressRegion: 'HI', addressCountry: 'US' },
      geo: { '@type': 'GeoCoordinates', latitude: trail.latitude, longitude: trail.longitude },
      isAccessibleForFree: !trail.permit_url
    }).replace(/</g, '\\u003c');
    const matchingGuides = guides.filter((guide) => matchesGuide(guide.slug, trail));
    const related = trails.filter((candidate) => candidate.trail_id !== trail.trail_id).map((candidate) => ({ candidate,
      score: Number(candidate.region === trail.region) * 4 + Number(candidate.trail_type === trail.trail_type) * 3 + Number(candidate.difficulty === trail.difficulty) * 2
    })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.candidate.trail_name.localeCompare(b.candidate.trail_name)).slice(0, 4).map(({ candidate }) => candidate);
    const staticContent = `<main><article style="max-width:900px;margin:60px auto;padding:24px"><p>${escapeHtml(trail.region)}</p><h1>${escapeHtml(trail.trail_name)}</h1><p>${escapeHtml(description)}</p>${matchingGuides.length ? `<h2>Oʻahu hiking guides</h2><ul>${matchingGuides.map((guide) => `<li><a href="https://hikeithawaii.com/guides/${guide.slug}/">${escapeHtml(guide.title)}</a></li>`).join('')}</ul>` : ''}<h2>Related Oʻahu trails</h2><ul>${related.map((candidate) => `<li><a href="https://hikeithawaii.com/trails/${slug(candidate.trail_name)}/">${escapeHtml(candidate.trail_name)}</a></li>`).join('')}</ul></article></main>`;
    const page = homepage
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
      .replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />')
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
      .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
      .replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`)
      .replace('</head>', `<script type="application/ld+json">${structuredData}</script></head>`);
    const directory = resolve(dist, 'trails', trailSlug);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), page);
  }

  for (const guide of guides) {
    const url = `https://hikeithawaii.com/guides/${guide.slug}/`;
    const title = `${guide.title} | HikeIt Hawaii`;
    const structuredData = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: guide.title,
      description: guide.description, url, isPartOf: { '@type': 'WebSite', name: 'HikeIt Hawaii', url: 'https://hikeithawaii.com/' }
    }).replace(/</g, '\\u003c');
    const staticContent = `<main><article style="max-width:900px;margin:60px auto;padding:24px"><p>Oʻahu hiking guide</p><h1>${escapeHtml(guide.title)}</h1><p>${escapeHtml(guide.description)}</p><p><a href="https://hikeithawaii.com/#trails">Browse all Oʻahu trails</a></p></article></main>`;
    const page = homepage
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(guide.description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
      .replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />')
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(guide.description)}" />`)
      .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(guide.description)}" />`)
      .replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`)
      .replace('</head>', `<script type="application/ld+json">${structuredData}</script></head>`);
    const directory = resolve(dist, 'guides', guide.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), page);
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(([url, frequency, priority]) => `  <url><loc>${url}</loc><lastmod>${lastmod}</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
  console.log(`Generated ${trails.length} indexable trail pages, ${guides.length} guide pages, and sitemap entries.`);
} catch (error) {
  console.warn(`Could not pre-render trail pages: ${error instanceof Error ? error.message : error}`);
}
