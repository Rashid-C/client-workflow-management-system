
'use client';

import { useEffect, useState } from 'react';

type ApiHealth = {
  status: string;
  service: string;
};

export default function Home() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const response = await fetch(
          'http://localhost:3001/api/v1/health',
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: ApiHealth = await response.json();
        setHealth(data);
      } catch {
        setError('Could not connect to the Tickwise API.');
      }
    }

    void checkApi();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Tickwise</h1>

      <p>Frontend-to-backend connection test</p>

      {health && (
        <p className="text-green-600">
          API Status: {health.status}
        </p>
      )}

      {error && (
        <p className="text-red-600">{error}</p>
      )}
    </main>
  );
}
