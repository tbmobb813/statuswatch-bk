'use client';

import { useEffect, useState } from 'react';

interface UptimeData {
  date: string;
  uptime: number;
  service: string;
}

export function UptimeChart() {
  const [uptimeData, setUptimeData] = useState<Record<string, UptimeData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUptimeData();
  }, []);

  const fetchUptimeData = async () => {
    try {
      // Prefer forwarding via the same-origin proxy when NEXT_PUBLIC_API_URL isn't set
      const endpoint = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/uptime?days=90`
        : `/api/uptime?days=90`;
      const response = await fetch(endpoint);

      // Guard against non-OK responses or HTML error pages which would break json()
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        console.warn('Uptime API returned non-OK:', response.status);
        return;
      }

      if (!contentType.includes('application/json')) {
        console.warn('Uptime API did not return JSON, content-type:', contentType);
        return;
      }

      const data = await response.json();

      if (data && data.success) {
        setUptimeData(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching uptime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'bg-green-500';
    if (uptime >= 99) return 'bg-green-400';
    if (uptime >= 95) return 'bg-yellow-400';
    if (uptime >= 90) return 'bg-orange-400';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-slate-700/50">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6" role="region" aria-labelledby="uptime-overview-heading">
      <h2 id="uptime-overview-heading" className="sr-only">90 day uptime overview</h2>
      <div className="space-y-6">
        {/* Screen-reader summary: list average uptimes per service for accessibility */}
  <div className="sr-only">
          <ul>
            {Object.entries(uptimeData).map(([serviceName, data]) => {
              const avgUptime = data.reduce((sum, d) => sum + d.uptime, 0) / data.length;
              return (
                <li key={serviceName}>{serviceName}: average uptime {avgUptime.toFixed(2)} percent</li>
              );
            })}
          </ul>
        </div>

        {Object.entries(uptimeData).map(([serviceName, data]) => {
          const avgUptime = data.reduce((sum, d) => sum + d.uptime, 0) / data.length;

          return (
            <div key={serviceName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900" id={`uptime-${serviceName}-label`}>{serviceName}</h3>
                <span className="text-sm font-semibold text-gray-900">
                  {avgUptime.toFixed(2)}% uptime
                </span>
              </div>
              
              <div className="flex gap-1">
                {data.slice(-90).map((day, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-8 rounded ${getUptimeColor(day.uptime)} tooltip`}
                    title={`${new Date(day.date).toLocaleDateString()}: ${day.uptime.toFixed(2)}%`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

  <div className="mt-6 flex items-center justify-between text-xs text-gray-700">
        <span>90 days ago</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>{'>'} 99.9%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-400"></div>
            <span>95-99%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>{'<'} 90%</span>
          </div>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}