import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// Get user's monitored services
router.get('/services', async (req: AuthRequest, res) => {
  try {
    const monitoredServices = await prisma.monitoredService.findMany({
      where: {
        userId: req.userId!
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      data: monitoredServices
    });
  } catch (error) {
    console.error('Error fetching monitored services:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add service to monitoring
router.post('/services/:serviceSlug', async (req: AuthRequest, res) => {
  try {
    const { serviceSlug } = req.params;

    const service = await prisma.service.findUnique({
      where: { slug: serviceSlug }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const monitoredService = await prisma.monitoredService.create({
      data: {
        userId: req.userId!,
        serviceId: service.id
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      data: monitoredService
    });
  } catch (error) {
    console.error('Error adding monitored service:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove service from monitoring
router.delete('/services/:serviceSlug', async (req: AuthRequest, res) => {
  try {
    const { serviceSlug } = req.params;

    const service = await prisma.service.findUnique({
      where: { slug: serviceSlug }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    await prisma.monitoredService.deleteMany({
      where: {
        userId: req.userId!,
        serviceId: service.id
      }
    });

    res.json({
      success: true,
      message: 'Service removed from monitoring'
    });
  } catch (error) {
    console.error('Error removing monitored service:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's alert preferences
router.get('/alerts', async (req: AuthRequest, res) => {
  try {
    let alertPreference = await prisma.alertPreference.findUnique({
      where: {
        userId: req.userId!
      }
    });

    // Create default preferences if they don't exist
    if (!alertPreference) {
      alertPreference = await prisma.alertPreference.create({
        data: {
          userId: req.userId!
        }
      });
    }

    res.json({
      success: true,
      data: alertPreference
    });
  } catch (error) {
    console.error('Error fetching alert preferences:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update alert preferences
router.put('/alerts', async (req: AuthRequest, res) => {
  try {
    const {
      emailEnabled,
      slackEnabled,
      discordEnabled,
      smsEnabled,
      onlyMonitored,
      severity,
      digestMode,
      discordWebhook,
      slackWebhook
    } = req.body;
  const { notifyOnDegraded, notifyOnOutage, notifyOnRecovery } = req.body;

    const alertPreference = await prisma.alertPreference.upsert({
      where: {
        userId: req.userId!
      },
      update: {
        ...(typeof emailEnabled === 'boolean' && { emailEnabled }),
        ...(typeof slackEnabled === 'boolean' && { slackEnabled }),
        ...(typeof discordEnabled === 'boolean' && { discordEnabled }),
        ...(typeof smsEnabled === 'boolean' && { smsEnabled }),
        ...(typeof onlyMonitored === 'boolean' && { onlyMonitored }),
        ...(severity !== undefined && { severity }),
        ...(typeof digestMode === 'boolean' && { digestMode }),
        ...(discordWebhook !== undefined && { discordWebhook }),
        ...(slackWebhook !== undefined && { slackWebhook })
      },
      create: {
        userId: req.userId!,
        ...(typeof notifyOnDegraded === 'boolean' && { notifyOnDegraded }),
        ...(typeof notifyOnOutage === 'boolean' && { notifyOnOutage }),
        ...(typeof notifyOnRecovery === 'boolean' && { notifyOnRecovery }),
        ...(typeof emailEnabled === 'boolean' && { emailEnabled }),
        ...(discordWebhook !== undefined && { discordWebhook }),
        ...(slackWebhook !== undefined && { slackWebhook })
      }
    });

    res.json({
      success: true,
      data: alertPreference
    });
  } catch (error) {
    console.error('Error updating alert preferences:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's notifications
router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const { limit = '50', unreadOnly = 'false' } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId!,
        ...(unreadOnly === 'true' && { read: false })
      },
      take: parseInt(limit as string),
      orderBy: {
        sentAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.userId!
      },
      data: {
        read: true
      }
    });

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId!,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;