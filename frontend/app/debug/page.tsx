import React from 'react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';
  let result: unknown = { error: 'unknown' };

  try {
    const res = await fetch(`${base}/api/dashboard/summary`, { cache: 'no-store' });
    result = await res.json();
  } catch (err) {
    result = { error: String(err) };
  }

  return (
    <div className={styles.container}>
      <h1>Debug: Server-side fetch of /api/dashboard/summary</h1>
      <pre className={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
      <p>This page fetches the backend from the Next server (server-side). If this shows the expected JSON, the backend is reachable from the frontend server runtime.</p>
    </div>
  );
}
