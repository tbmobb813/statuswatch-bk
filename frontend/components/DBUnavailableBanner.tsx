"use client";

import React, { useState } from 'react';
import { useDbStatus } from './DbStatusContext';

export function DBUnavailableBanner() {
  const { dbUnavailable, setDbUnavailable } = useDbStatus();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('dbBannerDismissed') === '1';
    } catch {
      return false;
    }
  });
  const [retrying, setRetrying] = useState(false);

  if (!dbUnavailable || dismissed) return null;

  const onClose = () => {
    setDismissed(true);
    localStorage.setItem('dbBannerDismissed', '1');
  };

  const onRetry = async () => {
    setRetrying(true);
    try {
      const resp = await fetch('/api/proxy/dashboard');
      if (resp.ok) {
        // Backend recovered
        setDbUnavailable(false);
        try {
          localStorage.removeItem('dbBannerDismissed');
        } catch {}
      }
    } catch {
      // ignore - we'll leave banner visible
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200" role="status" aria-live="polite" aria-atomic="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Data backend temporarily unavailable</p>
            <p className="text-xs text-yellow-700">Live data is currently unavailable. You may still view cached content.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="text-sm text-yellow-900 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded"
            onClick={onRetry}
            disabled={retrying}
            aria-label="Retry fetching live data"
            aria-disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Retry'}
          </button>

          <button
            className="text-sm text-yellow-900 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded"
            onClick={onClose}
            aria-label="Dismiss database unavailable banner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default DBUnavailableBanner;
