import { Router, NextFunction } from 'express';
import { StatusService } from '../services/status.service';

const router = Router();
const statusService = new StatusService();

// Get status for a specific service
router.get('/:slug', async (req, res, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const status = await statusService.checkServiceStatus(slug);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking status:', error);
    return next(error);
  }
});

// Check all services
router.get('/', async (req, res, next: NextFunction) => {
  try {
    const statuses = await statusService.checkAllServices();
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Error checking all statuses:', error);
    return next(error);
  }
});

// Force refresh status for a service
router.post('/:slug/refresh', async (req, res, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const status = await statusService.forceRefresh(slug);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error refreshing status:', error);
    return next(error);
  }
});

export default router;