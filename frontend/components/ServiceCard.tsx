interface ServiceCardProps {
  service: {
    slug: string;
    name: string;
    status: string;
    message?: string;
    lastChecked: Date;
    responseTime?: number;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusConfig = {
    operational: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      dot: 'bg-green-500',
      label: 'Operational'
    },
    degraded: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
      label: 'Degraded Performance'
    },
    partial_outage: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      dot: 'bg-orange-500',
      label: 'Partial Outage'
    },
    major_outage: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      dot: 'bg-red-500',
      label: 'Major Outage'
    },
    unknown: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
      label: 'Status Unknown'
    }
  };

  const config = statusConfig[service.status as keyof typeof statusConfig] || statusConfig.unknown;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
        <div className={`w-3 h-3 rounded-full ${config.dot}`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.text}`}>
            {config.label}
          </span>
        </div>

        {service.message && (
          <p className="text-sm text-gray-600">{service.message}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
          <span>
            Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
          </span>
          {service.responseTime && (
            <span>{service.responseTime}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}