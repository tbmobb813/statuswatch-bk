'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());

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
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'monitoring': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'identified': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'investigating': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300';
    }
  };

  const toggleIncident = (id: string) => {
    setExpandedIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-slate-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center border border-gray-200/50 dark:border-slate-700/50">
        <div className="text-green-600 dark:text-green-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-50 mb-1">No incidents reported</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">All services are running smoothly!</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-gray-200/50 dark:border-slate-700/50">
      <div className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
        {incidents.map((incident) => {
          const isExpanded = expandedIncidents.has(incident.id);
          return (
            <div
              key={incident.id}
              className="transition-all duration-300 hover:bg-gray-50/50 dark:hover:bg-slate-700/30"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
                        {incident.title}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        • {incident.service.name}
                      </span>
                    </div>

                    {/* Progressive Disclosure */}
                    {incident.description && (
                      <button
                        onClick={() => toggleIncident(incident.id)}
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>Hide details</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>Show details</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Description */}
                {incident.description && isExpanded && (
                  <div className="mb-3 overflow-hidden">
                    <div className="animate-in slide-in-from-top duration-300">
                      <p className="text-sm text-gray-600 dark:text-slate-300 bg-gray-50/50 dark:bg-slate-900/30 p-3 rounded-lg border-l-4 border-blue-500">
                        {incident.description}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)} backdrop-blur-sm`}>
                    {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(incident.impact)} backdrop-blur-sm`}>
                    {incident.impact.charAt(0).toUpperCase() + incident.impact.slice(1)} Impact
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(incident.startedAt).toLocaleString()}
                  </span>
                  {incident.resolvedAt && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Resolved {new Date(incident.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}