import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'status_change' | 'incident_update' | 'incident_resolved';
  serviceId?: string;
  incidentId?: string;
}

export class NotificationService {
  // Send notification to all enabled channels
  async sendNotification(payload: NotificationPayload) {
    try {
      const alertPreference = await prisma.alertPreference.findUnique({
        where: { userId: payload.userId }
      });

      if (!alertPreference) {
        console.log(`No alert preferences found for user ${payload.userId}`);
        return;
      }

      // Create notification record
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          read: false
        }
      });

      // Send email if enabled
      if (alertPreference.emailEnabled) {
        await this.sendEmail(payload);
      }

      // Send Discord webhook if configured
      if (alertPreference.discordWebhook) {
        await this.sendDiscordNotification(
          alertPreference.discordWebhook,
          payload
        );
      }

      // Send Slack webhook if configured
      if (alertPreference.slackWebhook) {
        await this.sendSlackNotification(
          alertPreference.slackWebhook,
          payload
        );
      }

      console.log(`✅ Sent notifications to user ${payload.userId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Notify users about status change
  async notifyStatusChange(
    serviceId: string,
    oldStatus: string,
    newStatus: string,
    message?: string
  ) {
    try {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          monitoredServices: {
            include: {
              user: {
                include: {
                  alertPreferences: true
                }
              }
            }
          }
        }
      });

      if (!service) return;

      // Determine notification type and filter users
      const shouldNotify = (pref: Record<string, unknown>) => {
        // Simple mapping: notify on any outage/degraded; recovery notifications only if severity is 'all'
        if (newStatus === 'operational' && oldStatus !== 'operational') {
          return (pref['severity'] === 'all');
        } else if (newStatus === 'degraded') {
          return true;
        } else if (newStatus.includes('outage')) {
          return true;
        }
        return false;
      };

      for (const monitored of service.monitoredServices) {
  const user = monitored.user;
  const pref = user.alertPreferences || null;

  if (pref && shouldNotify(pref)) {
          await this.sendNotification({
            userId: user.id,
            title: `${service.name} Status Change`,
            message: `${service.name} status changed from ${oldStatus} to ${newStatus}${
              message ? `: ${message}` : ''
            }`,
            type: 'status_change',
            serviceId: service.id
          });
        }
      }
    } catch (error) {
      console.error('Error notifying status change:', error);
    }
  }

  // Send email notification (implement with your email service)
  private async sendEmail(payload: NotificationPayload) {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.email) return;

      // TODO: Implement with Resend, SendGrid, or your email service
      console.log(`📧 Would send email to ${user.email}: ${payload.title}`);
      
      // Example with Resend:
      /*
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'StatusWatch <notifications@statuswatch.com>',
          to: user.email,
          subject: payload.title,
          html: `<p>${payload.message}</p>`
        })
      });
      */
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  // Send Discord webhook notification
  private async sendDiscordNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ) {
    try {
      const color = this.getColorForType(payload.type);

      await axios.post(webhookUrl, {
        embeds: [
          {
            title: payload.title,
            description: payload.message,
            color: color,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'StatusWatch'
            }
          }
        ]
      });

      console.log('✅ Discord notification sent');
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  // Send Slack webhook notification
  private async sendSlackNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ) {
    try {
      const emoji = this.getEmojiForType(payload.type);

      await axios.post(webhookUrl, {
        text: `${emoji} *${payload.title}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *${payload.title}*\n${payload.message}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `StatusWatch • ${new Date().toLocaleString()}`
              }
            ]
          }
        ]
      });

      console.log('✅ Slack notification sent');
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  private getColorForType(type: string): number {
    switch (type) {
      case 'status_change':
        return 0xffa500; // Orange
      case 'incident_update':
        return 0xff0000; // Red
      case 'incident_resolved':
        return 0x00ff00; // Green
      default:
        return 0x3b82f6; // Blue
    }
  }

  private getEmojiForType(type: string): string {
    switch (type) {
      case 'status_change':
        return '⚠️';
      case 'incident_update':
        return '🚨';
      case 'incident_resolved':
        return '✅';
      default:
        return 'ℹ️';
    }
  }
}