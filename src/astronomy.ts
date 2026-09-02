const SYNODIC_MONTH_DAYS = 29.53058867;
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(date = new Date()) {
  const elapsedDays = (date.getTime() - NEW_MOON_EPOCH_MS) / 86_400_000;
  const fraction = ((elapsedDays / SYNODIC_MONTH_DAYS) % 1 + 1) % 1;
  const labels = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  return { label: labels[Math.round(fraction * 8) % 8], illumination: Math.round(((1 - Math.cos(2 * Math.PI * fraction)) / 2) * 100) };
}

function hhmmMinutes(value: string) {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function isNightOnOahu(sunrise?: string, sunset?: string, date = new Date()) {
  const rise = sunrise ? hhmmMinutes(sunrise) : null;
  const set = sunset ? hhmmMinutes(sunset) : null;
  if (rise === null || set === null) return false;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Honolulu', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const now = Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
  return now < rise || now >= set;
}

export function formatOahuSunTime(value?: string) {
  const match = value?.match(/T(\d{2}):(\d{2})/);
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}
