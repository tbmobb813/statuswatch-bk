import { CheckCircle, AlertTriangle, AlertOctagon, XCircle, HelpCircle } from 'lucide-react';

interface ServiceCardProps {
  service: {
    slug: string;
    name: string;
    status: string;
    message?: string;
    lastChecked: Date;
    responseTime?: number;
    uptime?: number;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusConfig = {
    operational: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-300',
      dot: 'bg-green-500 dark:bg-green-400',
      label: 'Operational',
      icon: CheckCircle
    },
    degraded: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-300',
      dot: 'bg-yellow-500 dark:bg-yellow-400',
      label: 'Degraded Performance',
      icon: AlertTriangle
    },
    partial_outage: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-800 dark:text-orange-300',
      dot: 'bg-orange-500 dark:bg-orange-400',
      label: 'Partial Outage',
      icon: AlertOctagon
    },
    major_outage: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      dot: 'bg-red-500 dark:bg-red-400',
      label: 'Major Outage',
      icon: XCircle
    },
    unknown: {
      bg: 'bg-gray-50 dark:bg-slate-800',
      border: 'border-gray-200 dark:border-slate-700',
      text: 'text-gray-800 dark:text-slate-300',
      dot: 'bg-gray-500 dark:bg-slate-400',
      label: 'Status Unknown',
      icon: HelpCircle
    }
  };

  const config = statusConfig[service.status as keyof typeof statusConfig] || statusConfig.unknown;
  const StatusIcon = config.icon;

  // Calculate uptime percentage based on status if not provided
  const getUptimePercentage = () => {
    if (service.uptime !== undefined) return service.uptime;

    // Mock uptime based on status
    switch (service.status) {
      case 'operational': return 99.95;
      case 'degraded': return 98.2;
      case 'partial_outage': return 95.5;
      case 'major_outage': return 85.0;
      default: return null;
    }
  };

  const uptimePercentage = getUptimePercentage();

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-6 transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${config.text}`} />
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
        </div>
        <div className={`w-3 h-3 rounded-full ${config.dot}`} />
      </div>

  <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.text}`}>
            {config.label}
          </span>
        </div>

        {service.message && (
          <p className="text-sm text-gray-700">{service.message}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-700 pt-2 border-t border-gray-200">
          <span>
            Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
          </span>
          {service.responseTime && (
            <span className="font-mono bg-gray-100 dark:bg-slate-800/50 px-2 py-0.5 rounded">
              {service.responseTime}ms
            </span>
          )}
          {uptimePercentage !== null && uptimePercentage !== undefined && (
            <span className="text-sm text-gray-600 dark:text-slate-300">
              Uptime: {uptimePercentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}