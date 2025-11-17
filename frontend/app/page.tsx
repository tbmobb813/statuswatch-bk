'use client';

import { useEffect, useState } from 'react';
import { ServiceCard } from '@/components/ServiceCard';
import { IncidentList } from '@/components/IncidentList';
import { UptimeChart } from '@/components/UptimeChart';

interface ServiceStatus {
  slug: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
  message?: string;
  lastChecked: Date;
  responseTime?: number;
}

export default function Dashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchStatuses();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatuses = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';
      const response = await fetch(`${base}/api/dashboard/summary`);
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
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">StatusWatch</h1>
          <p className="mt-2 text-sm text-gray-600">
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
              <div className={`w-3 h-3 rounded-full ${
                overallStatus === 'operational' ? 'bg-green-500' :
                overallStatus === 'degraded' ? 'bg-yellow-500' :
                overallStatus === 'outage' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className="font-medium text-gray-900">
                {overallStatus === 'operational' && 'All Systems Operational'}
                {overallStatus === 'degraded' && 'Some Systems Experiencing Issues'}
                {overallStatus === 'outage' && 'Service Disruption Detected'}
                {overallStatus === 'unknown' && 'Loading...'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Service Status Grid */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </section>

            {/* Uptime Chart */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                90-Day Uptime History
              </h2>
              <UptimeChart />
            </section>

            {/* Recent Incidents */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Recent Incidents
              </h2>
              <IncidentList />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            StatusWatch - Monitoring the tools you rely on
          </p>
        </div>
      </footer>
    </div>
  );
}