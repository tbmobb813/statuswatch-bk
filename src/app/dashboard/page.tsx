import { prisma } from '../../lib/db';
import { monitoringService } from '../../lib/monitoring';

export default async function DashboardPage() {
  const services = await prisma.service.findMany({
    take: 5
  });
  
  const statusData = await Promise.all(
    services.map(async (service) => {
      const uptime = await monitoringService.calculateUptime(service.slug, 30);
      const recentChecks = await prisma.statusCheck.findMany({
        where: { serviceId: service.id },
        orderBy: { checkedAt: 'desc' },
        take: 1
      });
      
      return {
        ...service,
        uptime: uptime.toFixed(2),
        isUp: recentChecks[0]?.isUp ?? true,
        lastChecked: recentChecks[0]?.checkedAt
      };
    })
  );
  
  return (
    <main id="main-content" role="main" className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Service Status</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statusData.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <div
                  className={`w-3 h-3 rounded-full ${
                    service.isUp ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">
                    {service.isUp ? 'Operational' : 'Down'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>30-day uptime:</span>
                  <span className="font-medium">{service.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span>{service.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}