'use client';

import { useEffect, useState } from 'react';
import { useDbStatus } from '@/components/DbStatusContext';
import { ServiceCard } from '@/components/ServiceCard';
import { IncidentList } from '@/components/IncidentList';
import { UptimeChart } from '@/components/UptimeChart';
import { ThemeToggleSimple } from '@/components/ui/ThemeToggle';
import { Toaster } from 'sonner';

interface ServiceStatus {
  slug: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
  message?: string;
  lastChecked: Date;
  responseTime?: number;
  uptime?: number;
}

export default function Dashboard() {
  const { setDbUnavailable } = useDbStatus();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // removed debug hydration/rawResponse states
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        // Use same-origin proxy to avoid client-side cross-origin issues
        const response = await fetch('/api/proxy/dashboard');

        // If we get a 503 from the server, flag DB unavailable in the global context
        if (response.status === 503) {
          try {
            const err = await response.json();
            if (err && (err.code === 'db_unavailable' || err.error?.includes('Database unavailable'))) {
              setDbUnavailable(true);
            }
          } catch {
            setDbUnavailable(true);
          }
          // stop further processing when DB is unavailable
          return;
        }

        const data = await response.json();

        if (data && data.success) {
          // Map dashboard summary into the shape expected by this component
          type DashboardItem = {
            slug: string;
            name: string;
            status?: string;
            isUp?: boolean;
            lastChecked?: string | null;
          };

          const items = data.data as DashboardItem[];
          const mapped = items.map((s) => ({
            slug: s.slug,
            name: s.name,
            status: (s.status || (s.isUp ? 'operational' : 'major_outage')) as ServiceStatus['status'],
            message: undefined,
            lastChecked: s.lastChecked ? new Date(s.lastChecked) : new Date(),
            responseTime: undefined
          }));

          setServices(mapped);
          setLastUpdate(new Date());
          setErrorMessage(null);
        }
      } catch (error) {
        console.error('Error fetching statuses:', error);
        setErrorMessage(String(error));
        // If fetch itself failed (network or CORS), treat as DB unavailable indicator
        try {
          setDbUnavailable(true);
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [setDbUnavailable]);

  const getOverallStatus = () => {
    if (services.length === 0) return 'unknown';
    
    const hasOutage = services.some(s => s.status === 'major_outage' || s.status === 'partial_outage');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    if (hasOutage) return 'outage';
    if (hasDegraded) return 'degraded';
    return 'operational';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">StatusWatch</h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time status monitoring for your favorite developer tools
          </p>
        </div>
      </header>

      {/* Overall Status Banner */}
      <div className={`${
        overallStatus === 'operational' ? 'bg-green-50 border-green-200' :
        overallStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
        overallStatus === 'outage' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      } border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                overallStatus === 'operational' ? 'bg-green-500 dark:bg-green-400 shadow-lg shadow-green-500/50' :
                overallStatus === 'degraded' ? 'bg-yellow-500 dark:bg-yellow-400 shadow-lg shadow-yellow-500/50' :
                overallStatus === 'outage' ? 'bg-red-500 dark:bg-red-400 shadow-lg shadow-red-500/50' :
                'bg-gray-500 dark:bg-slate-400'
              }`} />
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {overallStatus === 'operational' && 'All Systems Operational'}
                {overallStatus === 'degraded' && 'Some Systems Experiencing Issues'}
                {overallStatus === 'outage' && 'Service Disruption Detected'}
                {overallStatus === 'unknown' && 'Loading...'}
              </span>
            </div>
            <span className="text-sm text-gray-700">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" role="main" aria-label="Primary content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* If an error occurred fetching statuses show it */}
            {errorMessage && (
              <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-red-200/50 dark:border-red-800/50">
                <h3 className="font-medium text-gray-900 dark:text-slate-50">Error</h3>
                <pre className="text-xs text-red-600 dark:text-red-400 mt-2">{errorMessage}</pre>
              </div>
            )}
            {/* Service Status Grid */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Services</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </section>

            {/* Uptime Chart */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">
                  90-Day Uptime History
                </h2>
              </div>
              <UptimeChart />
            </section>

            {/* Recent Incidents */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">
                  Recent Incidents
                </h2>
              </div>
              <IncidentList />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-700">
            StatusWatch - Monitoring the tools you rely on
          </p>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}