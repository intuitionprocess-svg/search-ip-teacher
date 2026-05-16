'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { haversineDistance } from '@/lib/distance';

interface Course {
  id: string | number;
  title: string;
  ctype: string;
  course_type_name: string;
  display_date: string;
  city: string;
  state: string;
  address: string;
  lat: number | null;
  lng: number | null;
  facilitator_name: string;
  contact_name: string;
  is_online_event: number;
  weekday_timings: string;
  weekend_timings: string;
  course_fee: number;
  recur_event_display: string;
  register_url: string;
  link: string;
}

interface UserLocation {
  lat: number;
  lng: number;
  query: string; // original input for display
}

const TYPE_OPTIONS = [
  { value: '', label: 'All IP Courses' },
  { value: 'Intuition Process Juniors (ages 5–7)',  label: 'Juniors (ages 5–7)' },
  { value: 'Intuition Process Kids (ages 8–12)',    label: 'Kids (ages 8–12)' },
  { value: 'Intuition Process Teens (ages 13–17)', label: 'Teens (ages 13–17)' },
  { value: 'Intuition Process Level 2',             label: 'Level 2' },
];

const RADIUS_OPTIONS = [10, 25, 50, 100, 200];

const TYPE_TAG: Record<string, [string, string]> = {
  'Intuition Process Juniors (ages 5–7)':  ['Juniors 5–7',  'bg-pink-100 text-pink-700'],
  'Intuition Process Kids (ages 8–12)':    ['Kids 8–12',    'bg-violet-100 text-violet-700'],
  'Intuition Process Teens (ages 13–17)':  ['Teens 13–17',  'bg-green-100 text-green-700'],
  'Intuition Process Level 2':             ['Level 2',      'bg-amber-100 text-amber-700'],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMi(n: number) {
  return n < 10 ? n.toFixed(1) + ' mi' : Math.round(n) + ' mi';
}

function CourseCard({ course, userLocation }: { course: Course; userLocation: UserLocation | null }) {
  const online = course.is_online_event === 1 || /online/i.test(course.address ?? '');
  const [typeLabel, typeCls] = TYPE_TAG[course.course_type_name] ?? ['', ''];
  const loc = [course.city, course.state].filter(Boolean).join(', ') || course.address || '—';
  const timing = course.weekday_timings || course.weekend_timings || '';
  const teacher = course.facilitator_name || course.contact_name || '';

  const dist =
    userLocation && course.lat != null && course.lng != null
      ? haversineDistance(userLocation.lat, userLocation.lng, course.lat, course.lng)
      : null;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all ${
      online ? 'bg-orange-50/70 border-orange-200' : 'bg-white border-[#f0ddd8]'
    }`}>
      <div className="flex justify-between items-start gap-2">
        <p className="font-bold text-[#3d2c28] text-sm leading-snug flex-1">{course.title}</p>
        <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
          {typeLabel && (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${typeCls}`}>
              {typeLabel}
            </span>
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
            online ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {online ? 'Online' : 'In-Person'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-[#9a7d76]">
        <span>📅 {course.display_date}{timing ? ' · ' + timing : ''}</span>
        <span>📍 {loc}</span>
        {teacher && <span>👤 {teacher}</span>}
        <span>💰 {course.course_fee > 0 ? `$${course.course_fee}` : 'Free'}</span>
        {course.recur_event_display && <span>🔁 {course.recur_event_display}</span>}
      </div>

      {dist !== null && (
        <span className="text-xs font-bold text-[#e8784a] bg-orange-50 rounded px-2 py-0.5 self-start">
          {fmtMi(dist)}
        </span>
      )}

      <div className="mt-auto flex gap-2 flex-wrap">
        {course.register_url && (
          <a href={course.register_url} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-gradient-to-r from-[#f0a080] to-[#e8784a] hover:opacity-85 transition-opacity">
            Register
          </a>
        )}
        {course.link && (
          <a href={`https://${course.link}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-orange-50 text-[#3d2c28] hover:opacity-85 transition-opacity">
            Details
          </a>
        )}
      </div>
    </div>
  );
}

export default function CourseFinder() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Browse filters
  const [typeFilter, setTypeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeState, setActiveState] = useState('');
  const [dateFilter, setDateFilter] = useState(today());

  // Location search (same two-field pattern as teacher search)
  const [cityState, setCityState] = useState('');
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(50);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Zip takes priority over city/state, same as teacher search
  const locationQuery = zip.trim() || cityState.trim();

  const loadCourses = useCallback(async (fromDate: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/courses?from_date=${fromDate}`);
      const data = await res.json() as { courses?: Course[]; error?: string };
      if (data.error) throw new Error(data.error);
      setCourses(data.courses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses(dateFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar state counts are always from all courses
  const stateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    courses.forEach((c) => {
      const s = c.state || 'Online / Unknown';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === 'Online / Unknown') return 1;
      if (b === 'Online / Unknown') return -1;
      return a.localeCompare(b);
    });
  }, [courses]);

  const allStates = useMemo(
    () => [...new Set(courses.map((c) => c.state).filter(Boolean))].sort(),
    [courses]
  );

  // Apply type + state filters, then radius filter + sort when location is active
  const filteredCourses = useMemo(() => {
    const sf = (stateFilter || activeState).toLowerCase();
    const tf = typeFilter.toLowerCase();

    let result = courses.filter((c) => {
      if (sf && (c.state ?? '').toLowerCase() !== sf) return false;
      if (tf && (c.course_type_name ?? '').toLowerCase() !== tf) return false;
      return true;
    });

    if (userLocation) {
      result = result
        .filter((c) => {
          if (c.lat == null || c.lng == null) return false;
          return haversineDistance(userLocation.lat, userLocation.lng, c.lat, c.lng) <= radius;
        })
        .sort((a, b) => {
          const da = haversineDistance(userLocation.lat, userLocation.lng, a.lat!, a.lng!);
          const db = haversineDistance(userLocation.lat, userLocation.lng, b.lat!, b.lng!);
          return da - db;
        });
    }

    return result;
  }, [courses, typeFilter, stateFilter, activeState, userLocation, radius]);

  // Used only when no location is active
  const groupedCourses = useMemo(() => {
    const map = new Map<string, Course[]>();
    filteredCourses.forEach((c) => {
      const s = c.state || 'Online / Unknown';
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(c);
    });
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'Online / Unknown') return 1;
      if (b === 'Online / Unknown') return -1;
      return a.localeCompare(b);
    });
  }, [filteredCourses]);

  async function handleLocationSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!locationQuery) {
      setGeoError('Enter a zip code or city and state.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
      const geo = await res.json() as { lat?: number; lng?: number; error?: string };
      if (geo.error) throw new Error(geo.error);
      setUserLocation({ lat: geo.lat!, lng: geo.lng!, query: locationQuery });
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Location not found.');
    } finally {
      setGeoLoading(false);
    }
  }

  function clearFilters() {
    setTypeFilter('');
    setStateFilter('');
    setActiveState('');
    setCityState('');
    setZip('');
    setUserLocation(null);
    setGeoError('');
  }

  function handleDateChange(val: string) {
    setDateFilter(val);
    setUserLocation(null);
    loadCourses(val);
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* Controls bar */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-[#f0ddd8] px-4 py-3 flex flex-wrap gap-3 items-end">

        {/* Browse filters */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">Course Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a] min-w-[150px]">
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">State</label>
          <select value={stateFilter || activeState}
            onChange={(e) => { setStateFilter(e.target.value); setActiveState(e.target.value); }}
            className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a] min-w-[150px]">
            <option value="">All States</option>
            {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">From Date</label>
          <input type="date" value={dateFilter} onChange={(e) => handleDateChange(e.target.value)}
            className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a]" />
        </div>

        {/* Divider */}
        <div className="w-px bg-[#f0ddd8] self-stretch mx-1 hidden sm:block" />

        {/* Location search — same two-field pattern as teacher search */}
        <form onSubmit={handleLocationSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">City &amp; State</label>
            <input type="text" value={cityState} onChange={(e) => setCityState(e.target.value)}
              placeholder="e.g. Denver, CO"
              className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a] w-36" />
          </div>

          <div className="self-end pb-2 text-[10px] font-bold text-[#9a7d76] uppercase tracking-wider">or</div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">Zip Code</label>
            <input type="text" inputMode="numeric" maxLength={5}
              value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 94103"
              className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a] w-28" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76]">Within</label>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}
              className="border border-[#f0ddd8] rounded-lg px-3 py-2 text-sm text-[#3d2c28] bg-white focus:outline-none focus:border-[#e8784a]">
              {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </div>

          <button type="submit" disabled={geoLoading}
            className="self-end px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#f0a080] to-[#e8784a] shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity">
            {geoLoading ? 'Searching…' : 'Search Nearby'}
          </button>
        </form>

        <button onClick={clearFilters}
          className="self-end px-4 py-2 rounded-lg text-sm font-semibold text-[#3d2c28] bg-orange-50 hover:bg-orange-100 transition-colors">
          Clear
        </button>
      </div>

      {/* Geo error */}
      {geoError && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">
          {geoError}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-[#9a7d76] bg-white/70 border-b border-[#f0ddd8]">
        {loading && (
          <svg className="w-3.5 h-3.5 animate-spin text-[#e8784a]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {loading ? 'Loading courses…'
          : error ? <span className="text-red-500">{error}</span>
          : `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} shown (${courses.length} total)`}
      </div>

      {/* Location banner */}
      {userLocation && (
        <div className="px-4 py-2 text-xs text-[#7a3820] bg-orange-50 border-b border-orange-200">
          Showing courses within <strong className="text-[#e8784a]">{radius} miles</strong> of{' '}
          <strong className="text-[#e8784a]">&ldquo;{userLocation.query}&rdquo;</strong>
          {' '}— sorted by distance
        </div>
      )}

      {/* Sidebar + course area */}
      <div className="flex flex-1">
        <nav className="w-48 flex-shrink-0 border-r border-[#f0ddd8] bg-white/75 overflow-y-auto sticky top-0 hidden md:block"
          style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d76] px-3.5 py-2">States</p>

          <button onClick={() => { setActiveState(''); setStateFilter(''); }}
            className={`w-full flex justify-between items-center px-3.5 py-1.5 text-sm border-l-2 transition-colors ${
              !activeState && !stateFilter
                ? 'border-[#e8784a] bg-orange-50 font-semibold text-[#e8784a]'
                : 'border-transparent hover:bg-orange-50 text-[#3d2c28]'
            }`}>
            <span>All States</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              !activeState && !stateFilter ? 'bg-[#e8784a] text-white' : 'bg-orange-100 text-[#9a7d76]'
            }`}>{courses.length}</span>
          </button>

          {stateCounts.map(([state, count]) => {
            const isActive = (activeState || stateFilter) === state;
            return (
              <button key={state}
                onClick={() => {
                  setActiveState(state); setStateFilter(state);
                  document.getElementById(`sec-${state.replace(/ /g, '-')}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-full flex justify-between items-center px-3.5 py-1.5 text-sm border-l-2 transition-colors ${
                  isActive ? 'border-[#e8784a] bg-orange-50 font-semibold text-[#e8784a]'
                    : 'border-transparent hover:bg-orange-50 text-[#3d2c28]'
                }`}>
                <span className="truncate text-left">{state}</span>
                <span className={`ml-1 flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[#e8784a] text-white' : 'bg-orange-100 text-[#9a7d76]'
                }`}>{count}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 p-4 overflow-y-auto">
          {loading && (
            <div className="text-center py-16 text-[#9a7d76]">
              <div className="text-3xl mb-3">🔄</div>
              <p className="font-medium">Fetching courses…</p>
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && filteredCourses.length === 0 && (
            <div className="text-center py-16 text-[#9a7d76]">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-semibold text-[#3d2c28]">No courses found</p>
              <p className="text-sm mt-1">
                {userLocation ? `Nothing within ${radius} miles — try a larger radius.` : 'Try adjusting your filters.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredCourses.length > 0 && (
            userLocation ? (
              // Location mode: flat list sorted by distance
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(295px,1fr))]">
                {filteredCourses.map((c, i) => (
                  <CourseCard key={i} course={c} userLocation={userLocation} />
                ))}
              </div>
            ) : (
              // Browse mode: grouped by state
              groupedCourses.map(([state, cs]) => (
                <StateSection key={state} state={state} courses={cs} userLocation={null} />
              ))
            )
          )}
        </main>
      </div>
    </div>
  );
}

function StateSection({ state, courses, userLocation }: {
  state: string;
  courses: Course[];
  userLocation: UserLocation | null;
}) {
  return (
    <div id={`sec-${state.replace(/ /g, '-')}`} className="mb-8">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-[#f0ddd8]">
        <h2 className="font-bold text-[#3d2c28]">{state}</h2>
        <span className="text-xs text-[#9a7d76] bg-orange-100 rounded-full px-2 py-0.5">
          {courses.length} course{courses.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(295px,1fr))]">
        {courses.map((c, i) => (
          <CourseCard key={i} course={c} userLocation={userLocation} />
        ))}
      </div>
    </div>
  );
}
