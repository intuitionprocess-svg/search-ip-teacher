export interface Coordinates {
  lat: number;
  lng: number;
}

interface ZipData {
  zip: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const zipcodes: { lookup: (zip: string) => ZipData | undefined } = require('zipcodes');

/** Convert a US zip code to coordinates using the local zip database (no API call). */
export function zipToCoords(zip: string): Coordinates | null {
  // Pad to 5 digits — CSV exports sometimes strip leading zeros (e.g. 08901 → 8901)
  const padded = zip.trim().padStart(5, '0');
  const info = zipcodes.lookup(padded);
  if (!info) return null;
  return { lat: info.latitude, lng: info.longitude };
}

/**
 * Geocode free-text user input (zip code or "City, State") to coordinates.
 * Uses the local zip database for 5-digit US zips; falls back to OpenStreetMap Nominatim.
 */
export async function geocodeUserInput(input: string): Promise<Coordinates | null> {
  const trimmed = input.trim();

  if (/^\d{5}$/.test(trimmed)) {
    const coords = zipToCoords(trimmed);
    if (coords) return coords;
  }

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=us`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ArtOfLivingTeacherSearch/1.0' },
  });

  if (!res.ok) return null;

  const data = await res.json() as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
