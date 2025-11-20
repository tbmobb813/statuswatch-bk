import React from 'react';
import { ServiceCard } from '@/components/ServiceCard';
import { UptimeChart } from '@/components/UptimeChart';
import { IncidentList } from '@/components/IncidentList';

export const dynamic = 'force-dynamic';

type DashboardItem = {
  slug: string;
  name: string;
  status?: string;
  isUp?: boolean;
  lastChecked?: string | null;
};

export default async function DashboardPage() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';
  let items: DashboardItem[] = [];

  try {
    const res = await fetch(`${base}/api/dashboard/summary`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        items = json.data as DashboardItem[];
      }
    }
  } catch (err) {
    // swallow - the client-side components will surface errors as well
    console.error('Error fetching dashboard summary:', err);
  }

  // Normalize to the shape ServiceCard expects
  const services = items.map((s) => ({
    slug: s.slug,
    name: s.name,
    status: (s.status || (s.isUp ? 'operational' : 'major_outage')) as string,
    message: undefined,
    lastChecked: s.lastChecked ? new Date(s.lastChecked) : new Date(),
    responseTime: undefined
  }));

  return (
    <main id="main-content" role="main" className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Service Status (migrated)</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">90-Day Uptime</h2>
          <UptimeChart />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recent Incidents</h2>
          <IncidentList />
        </section>
      </div>
    </main>
  );
}
