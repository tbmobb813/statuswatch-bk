'use client';

import { useEffect, useState } from 'react';

interface Incident {
  id: string;
  title: string;
  description?: string;
  status: string;
  impact: string;
  startedAt: string;
  resolvedAt?: string;
  service: {
    name: string;
  };
}

export function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      // Prefer forwarding via the same-origin proxy when NEXT_PUBLIC_API_URL isn't set
      const endpoint = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/incidents?limit=10`
        : `/api/incidents?limit=10`;
      const response = await fetch(endpoint);

      // Guard against non-OK responses or HTML error pages which would break json()
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        console.warn('Incidents API returned non-OK:', response.status);
        return;
      }

      if (!contentType.includes('application/json')) {
        console.warn('Incidents API did not return JSON, content-type:', contentType);
        return;
      }

      const data = await response.json();

      if (data && data.success) {
        setIncidents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'major': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'minor': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'monitoring': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'identified': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'investigating': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-green-600 dark:text-green-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No incidents reported</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">All services are running smoothly!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {incidents.map((incident) => (
          <div key={incident.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {incident.title}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    • {incident.service.name}
                  </span>
                </div>
                {incident.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {incident.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(incident.impact)}`}>
                {incident.impact.charAt(0).toUpperCase() + incident.impact.slice(1)} Impact
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(incident.startedAt).toLocaleString()}
              </span>
              {incident.resolvedAt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  → Resolved {new Date(incident.resolvedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}