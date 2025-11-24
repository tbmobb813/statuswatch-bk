import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { Resend } from 'resend';

const prisma = new PrismaClient();
// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'status_change' | 'incident_update' | 'incident_resolved';
  serviceId?: string;
  incidentId?: string;
}

export class NotificationService {
  // Simple retry helper with exponential backoff
  private retryAttempts: number = Number(process.env.DB_RETRY_ATTEMPTS ?? process.env.RETRY_ATTEMPTS ?? 5);
  private retryDelayMs: number = Number(process.env.DB_RETRY_DELAY_MS ?? process.env.RETRY_DELAY_MS ?? 300);
  private async retry<T>(fn: () => Promise<T>, attempts = 3, initialDelayMs = 300): Promise<T> {
    let lastErr: unknown;
    let delay = initialDelayMs;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
      }
    }
    throw lastErr;
  }
  // Send notification to all enabled channels
  async sendNotification(payload: NotificationPayload) {
    try {
      const alertPreference = await this.retry(() => prisma.alertPreference.findUnique({
        where: { userId: payload.userId }
      }), this.retryAttempts, this.retryDelayMs);

      if (!alertPreference) {
        console.log(`No alert preferences found for user ${payload.userId}`);
        return;
      }

      // Create notification record
      try {
        await this.retry(() => prisma.notification.create({
          data: {
            userId: payload.userId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            channel: 'in-app',
            read: false
          }
        }), this.retryAttempts, this.retryDelayMs);
      } catch (err) {
        console.error('Failed to persist notification after retries:', err);
      }

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
    message?: string | null
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

  // Send email notification
  private async sendEmail(payload: NotificationPayload) {
    try {
      // Get user email
      const user = await this.retry(() => prisma.user.findUnique({
        where: { id: payload.userId }
      }), this.retryAttempts, this.retryDelayMs);

      if (!user || !user.email) {
        console.log('No user email found, skipping email notification');
        return;
      }

      // Skip if no API key is configured
      if (!resend) {
        console.log(`📧 Email would be sent to ${user.email}: ${payload.title} (Resend API key not configured)`);
        return;
      }

      // Send email with Resend
      const emailHtml = this.generateEmailHtml(payload);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'StatusWatch <notifications@statuswatch.com>',
        to: user.email,
        subject: payload.title,
        html: emailHtml,
      });

      console.log(`✅ Email sent to ${user.email}: ${payload.title}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  // Generate HTML email template
  private generateEmailHtml(payload: NotificationPayload): string {
    const color = this.getEmailColorForType(payload.type);
    const emoji = this.getEmojiForType(payload.type);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${payload.title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${emoji} ${payload.title}</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">${payload.message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              This notification was sent by StatusWatch<br>
              ${new Date().toLocaleString()}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private getEmailColorForType(type: string): string {
    switch (type) {
      case 'status_change':
        return '#f59e0b'; // Orange
      case 'incident_update':
        return '#ef4444'; // Red
      case 'incident_resolved':
        return '#10b981'; // Green
      default:
        return '#3b82f6'; // Blue
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