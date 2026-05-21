import { NextRequest, NextResponse } from 'next/server';
import { fetchTeachers } from '@/lib/sheets';
import { geocodeUserInput, zipToCoords } from '@/lib/geocode';
import { haversineDistance } from '@/lib/distance';
import { STATE_ABBREV } from '@/lib/stateLookup';

export interface TeacherResult {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  timezone: string;
  rtc: string;
  distance: number;
}

// Returns the 2-letter state abbreviation if the input is a state name or abbreviation, else null.
function resolveStateAbbrev(input: string): string | null {
  const upper = input.trim().toUpperCase();
  if (STATE_ABBREV[upper]) return upper;

  const lower = input.trim().toLowerCase();
  for (const [abbr, name] of Object.entries(STATE_ABBREV)) {
    if (name.toLowerCase() === lower) return abbr;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { location?: string; radius?: number };
    const { location, radius } = body;

    if (!location || !radius) {
      return NextResponse.json(
        { error: 'Please provide both a location and a radius.' },
        { status: 400 }
      );
    }

    const teachers = fetchTeachers();

    // If the user entered just a state name or abbreviation, filter by state directly.
    const stateAbbrev = resolveStateAbbrev(location);
    if (stateAbbrev) {
      const results: TeacherResult[] = teachers
        .filter((t) => t.state.trim().toUpperCase() === stateAbbrev)
        .map((t) => ({
          firstName: t.firstName,
          lastName:  t.lastName,
          phone:     t.phone,
          email:     t.email,
          city:      t.city,
          state:     t.state,
          country:   t.country,
          zip:       t.zip,
          timezone:  t.timezone,
          rtc:       t.rtc,
          distance:  0,
        }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName));

      return NextResponse.json({ teachers: results, stateSearch: true });
    }

    const userCoords = await geocodeUserInput(location);
    if (!userCoords) {
      return NextResponse.json(
        { error: 'Could not find that location. Try a zip code, "City, State" (e.g. "Denver, CO"), or a state name.' },
        { status: 400 }
      );
    }

    const results: TeacherResult[] = [];

    for (const teacher of teachers) {
      // For radius search, try the teacher's zip first; fall back to city+state geocoding is not done here
      // (teachers without a zip are included if we can derive coords from their zip).
      if (!teacher.zip) continue;

      const coords = zipToCoords(teacher.zip);
      if (!coords) continue;

      const distance = haversineDistance(
        userCoords.lat, userCoords.lng,
        coords.lat, coords.lng
      );

      if (distance <= radius) {
        results.push({
          firstName: teacher.firstName,
          lastName:  teacher.lastName,
          phone:     teacher.phone,
          email:     teacher.email,
          city:      teacher.city,
          state:     teacher.state,
          country:   teacher.country,
          zip:       teacher.zip,
          timezone:  teacher.timezone,
          rtc:       teacher.rtc,
          distance:  Math.round(distance * 10) / 10,
        });
      }
    }

    results.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ teachers: results });
  } catch (err) {
    console.error('[search]', err);
    return NextResponse.json(
      { error: 'Something went wrong on the server. Please try again.' },
      { status: 500 }
    );
  }
}
