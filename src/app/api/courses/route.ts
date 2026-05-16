import { NextRequest, NextResponse } from 'next/server';
import { stateFromZip, stateFromCoords, STATE_ABBREV } from '@/lib/stateLookup';

// Full ctype list that makes the Art of Living API return results for youth programs.
// We filter down to just the four IP programs after fetching.
const YOUTH_CTYPES =
  '831290,831291,846608,1013761,995770,12385,12384,1078196,834191,834192,' +
  '1392901,1392902,12412,1458267,1458268,1517975,1517983,1518350,1518351,' +
  '1517984,1535152,1566804,1603578,1565382,565382,1517989,1559626,1559254,' +
  '1565006,1566803';

export const IP_CTYPES: Record<string, string> = {
  '1517975': 'Intuition Process Juniors (ages 5–7)',
  '1517983': 'Intuition Process Kids (ages 8–12)',
  '1517984': 'Intuition Process Teens (ages 13–17)',
  '1565382': 'Intuition Process Level 2',
};

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.artofliving.org',
  'Referer': 'https://www.artofliving.org/us-en/search/course',
  'Accept': 'application/json, */*',
};

function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCourse(c: Record<string, any>): Record<string, any> {
  const coords: [number, number] | null = c.coordinates ?? null;
  c.lng = coords ? coords[0] : null;
  c.lat = coords ? coords[1] : null;

  // If city looks like a zip code, use it for state lookup and clear it
  const cityVal = String(c.city ?? '').trim();
  if (/^\d{5}$/.test(cityVal)) {
    const inferred = stateFromZip(cityVal);
    if (inferred) c.state = inferred;
    c.city = '';
  }

  // Resolve missing state from zip_postal_code
  if (!c.state) {
    const zipRaw = String(c.zip_postal_code ?? '').trim();
    const match = zipRaw.match(/\b(\d{5})\b/);
    if (match) c.state = stateFromZip(match[1]);
  }

  // Final fallback: nearest state centroid
  if (!c.state && c.lat != null) {
    c.state = stateFromCoords(c.lat as number, c.lng as number);
  }

  // Expand state abbreviations to full names
  const st = String(c.state ?? '');
  if (st.length === 2 && STATE_ABBREV[st.toUpperCase()]) {
    c.state = STATE_ABBREV[st.toUpperCase()];
  }

  c.course_type_name = IP_CTYPES[String(c.ctype)] ?? '';

  const sd = String(c.start_date ?? '').slice(0, 10);
  const ed = String(c.end_date ?? '').slice(0, 10);
  c.display_date = sd === ed || !ed ? fmtDate(sd) : `${fmtDate(sd)} – ${fmtDate(ed)}`;

  return c;
}

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = req.nextUrl.searchParams.get('from_date') ?? today;
  const farFuture = new Date(Date.now() + 15 * 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const baseParams: Record<string, string> = {
    country: 'us',
    language: 'en-us',
    extend_to_limit: '1',
    start_date_to: farFuture,
    field_childrens: 'true',
    offset: '1',
    type: 'country',
    ctype: YOUTH_CTYPES,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCourses: Record<string, any>[] = [];
  let nextFrom = fromDate;

  try {
    for (let page = 0; page < 20; page++) {
      const params = new URLSearchParams({ ...baseParams, start_date_from: nextFrom });
      const url = `https://unity.artofliving.org/csapi/courses?${params}`;

      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Art of Living API error: ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json() as { courses?: Record<string, unknown>[]; total?: number };
      const batch = data.courses ?? [];
      if (!batch.length) break;

      allCourses.push(...batch);

      const total = data.total ?? 0;
      if (allCourses.length >= total || batch.length < 100) break;

      // Advance past the last batch's start date to paginate
      const lastDate = batch
        .map((c) => String(c.start_date ?? '').slice(0, 10))
        .sort()
        .at(-1) ?? nextFrom;

      const next = new Date(lastDate + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      nextFrom = next.toISOString().slice(0, 10);
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  // Keep only the four IP programs, then transform each course
  const courses = allCourses
    .filter((c) => IP_CTYPES[String(c.ctype)])
    .map(transformCourse);

  return NextResponse.json({ courses, total: courses.length });
}
