import React from 'react';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';
  let result: any = { error: 'unknown' };

  try {
    const res = await fetch(`${base}/api/dashboard/summary`, { cache: 'no-store' });
    result = await res.json();
  } catch (err) {
    result = { error: String(err) };
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Debug: Server-side fetch of /api/dashboard/summary</h1>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8fa', padding: 12, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre>
      <p>This page fetches the backend from the Next server (server-side). If this shows the expected JSON, the backend is reachable from the frontend server runtime.</p>
    </div>
  );
}
