import { NextRequest, NextResponse } from 'next/server';
import { fetchTeachers } from '@/lib/sheets';
import { geocodeUserInput, zipToCoords } from '@/lib/geocode';
import { haversineDistance } from '@/lib/distance';

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

    const userCoords = await geocodeUserInput(location);
    if (!userCoords) {
      return NextResponse.json(
        { error: 'Could not find that location. Try a zip code or "City, State" (e.g. "Denver, CO").' },
        { status: 400 }
      );
    }

    const teachers = fetchTeachers();

    const results: TeacherResult[] = [];

    for (const teacher of teachers) {
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
