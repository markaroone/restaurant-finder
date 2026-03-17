import geoip from 'geoip-lite';

import { logger } from '@/common/utils/logger';

// ─── Country Code Map ────────────────────────────────────────────────────────

/**
 * ISO 3166-1 alpha-2 country codes → full English names.
 * Used by resolveCountryFromIp to return human-readable country names.
 */
const ISO_COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan',
  AL: 'Albania',
  DZ: 'Algeria',
  AR: 'Argentina',
  AU: 'Australia',
  AT: 'Austria',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BR: 'Brazil',
  CA: 'Canada',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CZ: 'Czechia',
  DK: 'Denmark',
  EG: 'Egypt',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  IN: 'India',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  MY: 'Malaysia',
  MX: 'Mexico',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  NG: 'Nigeria',
  NO: 'Norway',
  PK: 'Pakistan',
  PH: 'Philippines',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  ZA: 'South Africa',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  TW: 'Taiwan',
  TH: 'Thailand',
  TR: 'Turkey',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  US: 'United States',
  VN: 'Vietnam',
};

// ─── IP Cleaning ─────────────────────────────────────────────────────────────

/**
 * Strips IPv6-mapped prefix and checks for private/loopback IPs.
 * Returns the cleaned IP or null if it's private/loopback.
 */
const cleanAndValidateIp = (ip: string): string | null => {
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.')
  ) {
    return null;
  }

  return cleanIp;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolves a lat,lng string from the client's IP address using the local
 * MaxMind GeoLite2 database (geoip-lite). Returns undefined if lookup fails.
 */
export const resolveIpLocation = (ip?: string): string | undefined => {
  if (!ip) return undefined;

  const cleanIp = cleanAndValidateIp(ip);
  if (!cleanIp) {
    logger.debug({ ip }, '⏭️ Skipping geoip for private/loopback IP');
    return undefined;
  }

  const geo = geoip.lookup(cleanIp);
  if (geo?.ll && geo.city) {
    const [lat, lng] = geo.ll;
    logger.info(
      { ip: cleanIp, city: geo.city, ll: `${lat},${lng}` },
      '📍 Resolved IP to location via geoip-lite',
    );
    return `${lat},${lng}`;
  }

  logger.debug({ ip: cleanIp }, '⚠️ geoip-lite lookup returned no result');
  return undefined;
};

/**
 * Resolves the country name from the client's IP via geoip-lite.
 * Returns null if the lookup fails or the IP is private.
 */
export const resolveCountryFromIp = (ip?: string): string | null => {
  if (!ip) return null;

  const cleanIp = cleanAndValidateIp(ip);
  if (!cleanIp) return null;

  const geo = geoip.lookup(cleanIp);
  if (!geo?.country) return null;

  return ISO_COUNTRY_NAMES[geo.country] ?? geo.country;
};
