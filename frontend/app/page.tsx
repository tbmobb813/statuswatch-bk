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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                StatusWatch
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Real-time status monitoring for your favorite developer tools
              </p>
            </div>
            <ThemeToggleSimple />
          </div>
        </div>
      </header>

      {/* Overall Status Banner with Glassmorphism */}
      <div className={`${
        overallStatus === 'operational' ? 'bg-green-50/80 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/50' :
        overallStatus === 'degraded' ? 'bg-yellow-50/80 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-800/50' :
        overallStatus === 'outage' ? 'bg-red-50/80 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50' :
        'bg-gray-50/80 dark:bg-slate-800/50 border-gray-200/50 dark:border-slate-700/50'
      } border-b backdrop-blur-sm`}>
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
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-10">
            {/* Service Status Grid Skeleton */}
            <section>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 rounded-lg w-32 mb-6 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6 shadow-lg">
                    <div className="animate-pulse space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                        <div className="h-3 w-3 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div className="h-px bg-gray-200/50 dark:bg-slate-700/50"></div>
                      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Uptime Chart Skeleton */}
            <section>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 rounded-lg w-48 mb-6 animate-pulse"></div>
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6 shadow-lg">
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </section>

            {/* Incidents Skeleton */}
            <section>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 rounded-lg w-40 mb-6 animate-pulse"></div>
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6 shadow-lg">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </section>
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

      {/* Footer with Glassmorphism */}
      <footer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-slate-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              StatusWatch - Monitoring the tools you rely on
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
              <span>Built with</span>
              <span className="text-red-500">♥</span>
              <span>using Next.js & TypeScript</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}