
'use client';

import { useEffect, useState } from 'react';


type WorkSummary = {
  label: string;
  value: string;
  description: string;
};

const workSummary: WorkSummary[] = [
  {
    label: 'Open engagements',
    value: '—',
    description: 'Active client work',
  },
  {
    label: 'Awaiting action',
    value: '—',
    description: 'Work ready to progress',
  },
  {
    label: 'Blocked',
    value: '—',
    description: 'Requires attention',
  },
  {
    label: 'Overdue',
    value: '—',
    description: 'Past its due date',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] p-5 sm:p-7 lg:p-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-teal-800">
          WORKSPACE OVERVIEW
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Good to have you here.
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Keep client engagements moving, follow up on outstanding work,
          and identify anything that needs attention.
        </p>
      </header>

      <section aria-labelledby="work-summary-heading">
        <div className="mb-4">
          <h2
            id="work-summary-heading"
            className="text-base font-semibold text-slate-900"
          >
            Work at a glance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your operational overview will appear here.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workSummary.map((item) => (
            <article
              key={item.label}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <h3 className="text-sm font-medium text-slate-600">
                {item.label}
              </h3>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {item.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="getting-started-heading"
        className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2
          id="getting-started-heading"
          className="text-base font-semibold text-slate-900"
        >
          Your workspace is being prepared
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Client records, workflow stages, employee assignments, and
          document expiry tracking will be connected as we build each
          module. Live counts will replace these placeholders when the
          backend and database integration are ready.
        </p>
      </section>
    </div>
  );
}
