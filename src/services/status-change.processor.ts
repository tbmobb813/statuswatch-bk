import { NotificationService } from './notification.service';
import { prisma } from '../lib/db';

type StatusCheck = { isUp: boolean; checkedAt: Date };

/**
 * Process a detected status update for a service.
 *
 * This function is intentionally dependency-injectable for easy unit testing. If
 * notificationService or prismaClient are omitted, the default implementations
 * from the application will be used.
 */
export async function processStatusChange(
  service: { id: string; name: string; statusChecks: StatusCheck[] } | null,
  currentStatus: { slug: string; message?: string | null },
  deps?: { notificationService?: { notifyStatusChange: (serviceId: string, prev: string, curr: string, msg?: string | null) => Promise<void> }; prismaClient?: typeof prisma }
) {
  const notificationService = deps?.notificationService ?? new NotificationService();
  const prismaClient = deps?.prismaClient ?? prisma;

  if (!service || !service.statusChecks || service.statusChecks.length < 2) return;

  const [current, previous] = service.statusChecks;
  if (current.isUp === previous.isUp) return;

  const prevStatus = previous.isUp ? 'operational' : 'outage';
  const currStatus = current.isUp ? 'operational' : 'outage';
  try {
    console.log(`⚠️  Status change detected for ${service.name}: ${prevStatus} → ${currStatus}`);

    await notificationService.notifyStatusChange(
      service.id,
      prevStatus,
      currStatus,
      currentStatus.message
    );

    // Create incident if degraded
    if (!current.isUp && previous.isUp) {
      const impact = determineImpact(currStatus);
      await prismaClient.incident.create({
        data: {
          serviceId: service.id,
          title: `Service ${currStatus.replace('_', ' ')}`,
          description: currentStatus.message || undefined,
          status: 'investigating',
          severity: impact === 'critical' ? 'critical' : impact === 'major' ? 'major' : 'minor',
          startedAt: new Date(),
          impact
        }
      });
      console.log(`📝 Created new incident for service ${service.id}`);
    }

    // Resolve incidents if recovered
    if (current.isUp && !previous.isUp) {
      await prismaClient.incident.updateMany({
        where: { serviceId: service.id, status: { not: 'resolved' } },
        data: { status: 'resolved', resolvedAt: new Date() }
      });
      console.log(`✅ Resolved incidents for service ${service.id}`);
    }
  } catch (err) {
    console.error('Error processing status change:', err);
  }
}

function determineImpact(status: string): string {
  switch (status) {
    case 'major_outage':
      return 'critical';
    case 'partial_outage':
      return 'major';
    case 'degraded':
      return 'minor';
    default:
      return 'none';
  }
}

export default processStatusChange;
