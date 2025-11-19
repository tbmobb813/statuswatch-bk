"use client";

import React, { useEffect, useState } from 'react';
import { useDbStatus } from './DbStatusContext';

export function DBUnavailableBanner() {
  const { dbUnavailable, setDbUnavailable } = useDbStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('dbBannerDismissed');
    setDismissed(s === '1');
  }, []);

  if (!dbUnavailable || dismissed) return null;

  const onClose = () => {
    setDismissed(true);
    localStorage.setItem('dbBannerDismissed', '1');
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Data backend temporarily unavailable</p>
            <p className="text-xs text-yellow-700">Live data is currently unavailable. You may still view cached content.</p>
          </div>
        </div>
        <div>
          <button className="text-sm text-yellow-700 underline" onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

export default DBUnavailableBanner;
