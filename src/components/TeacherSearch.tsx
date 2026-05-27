'use client';

import { useState, useRef } from 'react';
import type { TeacherResult } from '@/app/api/search/route';

const RADIUS_OPTIONS = [10, 25, 50, 100, 200];

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.667 3.5-7.827a8 8 0 10-16 0c0 3.16 1.556 5.814 3.5 7.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}

export default function TeacherSearch() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(25);
  const [results, setResults] = useState<TeacherResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [isStateSearch, setIsStateSearch] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) {
      setError('Please enter a city, state, or zip code.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, radius }),
      });

      const data = await res.json() as { teachers?: TeacherResult[]; error?: string; stateSearch?: boolean };

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
        setResults([]);
      } else {
        setResults(data.teachers ?? []);
        setIsStateSearch(data.stateSearch ?? false);
        setSearched(true);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="max-w-lg mx-auto mt-10 px-4">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-lg p-7 flex flex-col gap-5"
        >
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">
              Location
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <MapPinIcon />
              </span>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, or zip — e.g. Chicago or TX or 80132"
                className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Try: &ldquo;Columbus&rdquo;, &ldquo;Ohio&rdquo;, &ldquo;Columbus OH&rdquo;, or a zip code</p>
          </div>

          <div>
            <label htmlFor="radius" className="block text-sm font-semibold text-gray-700 mb-1">
              Search Radius
            </label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>Within {r} miles</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
          >
            {loading ? 'Searching…' : 'Search for Teachers'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </section>

      {searched && (
        <section ref={resultsRef} className="max-w-lg mx-auto mt-8 px-4 pb-16">
          <p className="text-sm text-gray-500 mb-4">
            {results.length === 0
              ? isStateSearch
                ? `No teachers found in that state.`
                : `No teachers found within ${radius} miles. Try expanding your radius.`
              : isStateSearch
                ? `${results.length} teacher${results.length !== 1 ? 's' : ''} found`
                : `${results.length} teacher${results.length !== 1 ? 's' : ''} found within ${radius} miles`}
          </p>

          <div className="flex flex-col gap-4">
            {results.map((teacher, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-2">
                  <h2 className="font-semibold text-gray-900 text-lg leading-tight">
                    {teacher.firstName} {teacher.lastName}
                  </h2>
                  {!isStateSearch && (
                    <span className="shrink-0 text-xs font-medium bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                      {teacher.distance} mi
                    </span>
                  )}
                </div>

                <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1.5">
                  <MapPinIcon />
                  {teacher.city}, {teacher.state} {teacher.zip}
                </p>

                <div className="mt-3 flex flex-col gap-1.5">
                  {teacher.phone && (
                    <a href={`tel:${teacher.phone}`} className="flex items-center gap-1.5 text-orange-600 text-sm hover:text-orange-800 hover:underline">
                      <PhoneIcon />
                      {teacher.phone}
                    </a>
                  )}
                  {teacher.email && (
                    <a href={`mailto:${teacher.email}`} className="flex items-center gap-1.5 text-orange-600 text-sm hover:text-orange-800 hover:underline">
                      <EmailIcon />
                      {teacher.email}
                    </a>
                  )}
                </div>

                {(teacher.rtc || teacher.timezone) && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {teacher.rtc && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        RTC: {teacher.rtc}
                      </span>
                    )}
                    {teacher.timezone && (
                      <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                        {teacher.timezone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
