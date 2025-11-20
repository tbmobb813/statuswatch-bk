import { Router, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Minimal request/response shapes to avoid external type dependency in scripts
type SimpleReq = { query?: Record<string, unknown>; params?: Record<string, string> };
type SimpleRes = { json: (body: unknown) => void; status: (code: number) => { json: (body: unknown) => void } };

// Get uptime statistics
router.get('/', async (req: SimpleReq, res: SimpleRes, next: NextFunction) => {
  try {
    const { days = '90', serviceSlug } = (req.query as Record<string, string | undefined>) || {};
    const daysCount = parseInt(days as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    const where = serviceSlug 
      ? {
          service: {
            slug: serviceSlug as string
          },
          checkedAt: {
            gte: startDate
          }
        }
      : {
          checkedAt: {
            gte: startDate
          }
        };

    const statusChecks = await prisma.statusCheck.findMany({
      where,
      include: {
        service: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        checkedAt: 'asc'
      }
    });

  // Group by service and date
  type DayRow = { date: string; total: number; operational: number; service: string };
  const uptimeByService: Record<string, DayRow[]> = {};

    statusChecks.forEach(check => {
      const serviceName = check.service.name;
      const date = check.checkedAt.toISOString().split('T')[0];
      
      if (!uptimeByService[serviceName]) {
        uptimeByService[serviceName] = [];
      }

      const existingDay = uptimeByService[serviceName].find(d => d.date === date);
      
      if (existingDay) {
        existingDay.total++;
        if (check.isUp) {
          existingDay.operational++;
        }
      } else {
        uptimeByService[serviceName].push({
          date,
          total: 1,
          operational: check.isUp ? 1 : 0,
          service: serviceName
        });
      }
    });

    // Calculate uptime percentage for each day and build output
    const outputByService: Record<string, { date: string; uptime: number; service: string }[]> = {};
    Object.keys(uptimeByService).forEach((service) => {
      outputByService[service] = uptimeByService[service].map(day => ({
        date: day.date,
        uptime: (day.operational / day.total) * 100,
        service: day.service
      }));
    });

    res.json({
      success: true,
      data: outputByService
    });
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    return next(error);
  }
});

// Get overall uptime for a service
router.get('/:slug', async (req: SimpleReq, res: SimpleRes, next: NextFunction) => {
  try {
    const slug = req.params?.slug;
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Missing service slug parameter'
      });
    }
    const { days = '30' } = (req.query as Record<string, string | undefined>) || {};
    
    const daysCount = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    const service = await prisma.service.findUnique({
      where: { slug }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const statusChecks = await prisma.statusCheck.findMany({
      where: {
        serviceId: service.id,
        checkedAt: {
          gte: startDate
        }
      }
    });

    const total = statusChecks.length;
  const operational = statusChecks.filter(c => c.isUp).length;
  const uptime = total > 0 ? (operational / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        service: service.name,
        slug: service.slug,
        uptime: parseFloat(uptime.toFixed(2)),
        totalChecks: total,
        operationalChecks: operational,
        period: `${daysCount} days`
      }
    });
  } catch (error) {
    console.error('Error fetching service uptime:', error);
    return next(error);
  }
});

export default router;
