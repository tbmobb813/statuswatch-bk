'use client';

import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { ServiceCard } from '@/components/ServiceCard';
import { IncidentList } from '@/components/IncidentList';
import { UptimeChart } from '@/components/UptimeChart';
import { ThemeToggleSimple } from '@/components/ui/ThemeToggle';

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
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // removed debug hydration/rawResponse states
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
  fetchStatuses();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatuses = async () => {
    try {
  // Use same-origin proxy to avoid client-side cross-origin issues
  const response = await fetch('/api/proxy/dashboard');
      const data = await response.json();

  if (data.success) {
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

        // Show toast on successful refresh (but not on initial load)
        if (!loading) {
          toast.success('Status updated', {
            duration: 3000,
            position: 'bottom-right'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      setErrorMessage(String(error));

      // Show error toast
      toast.error('Failed to update status', {
        description: 'Retrying automatically...',
        duration: 4000,
        position: 'bottom-right'
      });
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50">StatusWatch</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Real-time status monitoring for your favorite developer tools
              </p>
            </div>
            <ThemeToggleSimple />
          </div>
        </div>
      </header>

      {/* Overall Status Banner */}
      <div className={`${
        overallStatus === 'operational' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
        overallStatus === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
        overallStatus === 'outage' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
        'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
      } border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                overallStatus === 'operational' ? 'bg-green-500 dark:bg-green-400' :
                overallStatus === 'degraded' ? 'bg-yellow-500 dark:bg-yellow-400' :
                overallStatus === 'outage' ? 'bg-red-500 dark:bg-red-400' :
                'bg-gray-500 dark:bg-slate-400'
              }`} />
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {overallStatus === 'operational' && 'All Systems Operational'}
                {overallStatus === 'degraded' && 'Some Systems Experiencing Issues'}
                {overallStatus === 'outage' && 'Service Disruption Detected'}
                {overallStatus === 'unknown' && 'Loading...'}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-8">
            {/* Service Status Grid Skeleton */}
            <section>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                        <div className="h-3 w-3 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div className="h-px bg-gray-200 dark:bg-slate-700"></div>
                      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Uptime Chart Skeleton */}
            <section>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </section>

            {/* Incidents Skeleton */}
            <section>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4"></div>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-8">
            {/* If an error occurred fetching statuses show it */}
            {errorMessage && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-sm border border-red-200 dark:border-red-800">
                <h3 className="font-medium text-gray-900 dark:text-slate-50">Error</h3>
                <pre className="text-xs text-red-600 dark:text-red-400 mt-2">{errorMessage}</pre>
              </div>
            )}
            {/* Service Status Grid */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </section>

            {/* Uptime Chart */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                90-Day Uptime History
              </h2>
              <UptimeChart />
            </section>

            {/* Recent Incidents */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Recent Incidents
              </h2>
              <IncidentList />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            StatusWatch - Monitoring the tools you rely on
          </p>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}