import { Router, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createIncidentSchema,
  updateIncidentSchema,
  createIncidentUpdateSchema
} from '../schemas/incident.schema';

const router = Router();
const prisma = new PrismaClient();

// Get recent incidents
router.get('/', async (req, res, next: NextFunction) => {
  try {
    const { limit = '10', status } = req.query;
    
    const where = status ? { status: status as string } : {};
    
    const incidents = await prisma.incident.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { startedAt: 'desc' },
      include: {
        service: {
          select: {
            name: true,
            slug: true
          }
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    res.json({
      success: true,
      data: incidents
    });
  } catch (error: unknown) {
    console.error('Error fetching incidents:', error);
    return next(error);
  }
});

// Get incident by ID
router.get('/:id', async (req, res, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        service: true,
        updates: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    return next(error);
  }
});

// Create incident (admin)
router.post('/', async (req, res, next: NextFunction) => {
  try {
    const { serviceId, title, description, status, impact } = req.body;
    
    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        status: status || 'investigating',
        severity: impact || 'minor',
        startedAt: new Date(),
        service: {
          connect: { id: serviceId }
        }
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      data: incident
    });
    } catch (error) {
      console.error('Error creating incident:', error);
      return next(error);
    }
  });

router.patch('/:id', async (req, res, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, title, description, impact } = req.body;
    const severity = impact;
    
    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(severity && { severity }),
        ...(status === 'resolved' && { resolvedAt: new Date() })
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    return next(error);
  }
});

// Add incident update
router.post('/:id/updates', async (req, res, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;
    
    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        message,
        status: status || 'update'
      }
    });

    res.json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error adding incident update:', error);
    return next(error);
  }
});

export default router;