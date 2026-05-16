import { NextRequest, NextResponse } from 'next/server';
import { geocodeUserInput } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  const coords = await geocodeUserInput(q);
  if (!coords) {
    return NextResponse.json(
      { error: 'Could not find that location. Try a zip code or "City, State".' },
      { status: 404 }
    );
  }

  return NextResponse.json({ lat: coords.lat, lng: coords.lng });
}
