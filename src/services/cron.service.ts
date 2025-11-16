import cron from 'node-cron';
import { StatusService } from './status.service';
import { NotificationService } from './notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const statusService = new StatusService();
const notificationService = new NotificationService();

export class CronService {
  private tasks: cron.ScheduledTask[] = [];

  // Check all services every 2 minutes
  startStatusMonitoring() {
    const task = cron.schedule('*/2 * * * *', async () => {
      console.log('🔍 Running scheduled status checks...');
      try {
        const statuses = await statusService.checkAllServices();
        console.log(`✅ Checked ${statuses.length} services`);
        
        // Check for status changes and trigger alerts
        for (const status of statuses) {
          await this.checkForStatusChange(status);
        }
      } catch (error) {
        console.error('❌ Error in scheduled status check:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Status monitoring cron job started (every 2 minutes)');
  }

  // Check every 5 minutes for unresolved incidents
  startIncidentMonitoring() {
    const task = cron.schedule('*/5 * * * *', async () => {
      console.log('🔍 Checking for unresolved incidents...');
      try {
        const unresolvedIncidents = await prisma.incident.findMany({
          where: {
            status: {
              not: 'resolved'
            }
          },
          include: {
            service: true
          }
        });

        console.log(`Found ${unresolvedIncidents.length} unresolved incidents`);
      } catch (error) {
        console.error('❌ Error checking incidents:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Incident monitoring cron job started (every 5 minutes)');
  }

  // Clean up old status checks (keep last 7 days)
  startCleanupTask() {
    // Run daily at 2 AM
    const task = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running cleanup task...');
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const deleted = await prisma.statusCheck.deleteMany({
          where: {
            checkedAt: {
              lt: sevenDaysAgo
            }
          }
        });

        console.log(`✅ Deleted ${deleted.count} old status checks`);
      } catch (error) {
        console.error('❌ Error in cleanup task:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Cleanup cron job started (daily at 2 AM)');
  }

  private async checkForStatusChange(currentStatus: any) {
    try {
      const service = await prisma.service.findUnique({
        where: { slug: currentStatus.slug },
        include: {
          statusChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 2
          }
        }
      });

      if (!service || service.statusChecks.length < 2) {
        return;
      }

      const [current, previous] = service.statusChecks;

      // Status changed
      if (current.status !== previous.status) {
        console.log(`⚠️  Status change detected for ${service.name}: ${previous.status} → ${current.status}`);

        // Send notifications to users
        await notificationService.notifyStatusChange(
          service.id,
          previous.status,
          current.status,
          current.message
        );

        // Create incident if status degraded
        if (current.status !== 'operational' && previous.status === 'operational') {
          await this.createIncident(service.id, current.status, current.message);
        }

        // Resolve incident if service recovered
        if (current.status === 'operational' && previous.status !== 'operational') {
          await this.resolveIncidents(service.id);
        }
      }
    } catch (error) {
      console.error('Error checking status change:', error);
    }
  }

  private async createIncident(serviceId: string, status: string, message?: string | null) {
    const impact = this.determineImpact(status);
    
    await prisma.incident.create({
      data: {
        serviceId,
        title: `Service ${status.replace('_', ' ')}`,
        description: message || undefined,
        status: 'investigating',
        impact
      }
    });

    console.log(`📝 Created new incident for service ${serviceId}`);
  }

  private async resolveIncidents(serviceId: string) {
    await prisma.incident.updateMany({
      where: {
        serviceId,
        status: {
          not: 'resolved'
        }
      },
      data: {
        status: 'resolved',
        resolvedAt: new Date()
      }
    });

    console.log(`✅ Resolved incidents for service ${serviceId}`);
  }

  private determineImpact(status: string): string {
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

  startAll() {
    this.startStatusMonitoring();
    this.startIncidentMonitoring();
    this.startCleanupTask();
  }

  stopAll() {
    this.tasks.forEach(task => task.stop());
    console.log('🛑 All cron jobs stopped');
  }
}