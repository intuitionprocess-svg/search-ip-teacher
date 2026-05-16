'use client';

import { useState } from 'react';
import TeacherSearch from '@/components/TeacherSearch';
import CourseFinder from '@/components/CourseFinder';

type Tab = 'teacher' | 'course';

export default function Home() {
  const [tab, setTab] = useState<Tab>('teacher');

  return (
    <main className="min-h-screen bg-[#fdf4ef]">
      <header className="bg-gradient-to-r from-orange-600 to-amber-500 text-white py-10 px-4 text-center shadow-md">
        <h1 className="text-4xl font-bold tracking-tight mb-1">Intuition Process</h1>
        <p className="text-orange-100 text-lg">Find teachers and courses near you</p>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex">
          {(['teacher', 'course'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#e8784a] text-[#e8784a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t === 'teacher' ? 'Find a Teacher' : 'Find a Course'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'teacher' ? <TeacherSearch /> : <CourseFinder />}
    </main>
  );
}
