import { Router } from 'express';
import { prisma } from '../lib/db';
import { monitoringService } from '../lib/monitoring';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const services = await prisma.service.findMany({ take: 10 });

    const data = await Promise.all(
      services.map(async (s) => {
        const uptime = await monitoringService.calculateUptime(s.slug, 30);
        const recentChecks = await prisma.statusCheck.findMany({
          where: { serviceId: s.id },
          orderBy: { checkedAt: 'desc' },
          take: 1,
        });

        return {
          id: s.id,
          slug: s.slug,
          name: s.name,
          category: s.category,
          uptime: Number(uptime.toFixed(2)),
          isUp: recentChecks[0]?.isUp ?? true,
          lastChecked: recentChecks[0]?.checkedAt ?? null,
          // derive a simple status string for the frontend
          status: recentChecks[0]?.isUp ? 'operational' : 'major_outage'
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error building dashboard summary:', err);
    res.status(500).json({ success: false, error: 'Failed to build dashboard summary' });
  }
});

export default router;
