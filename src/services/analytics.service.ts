import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MTTRData {
  serviceId: string;
  serviceName: string;
  slug: string;
  mttr: number; // in minutes
  totalIncidents: number;
  resolvedIncidents: number;
}

export interface MTTDData {
  serviceId: string;
  serviceName: string;
  slug: string;
  mttd: number; // in minutes
  totalIncidents: number;
}

export interface ReliabilityScore {
  serviceId: string;
  serviceName: string;
  slug: string;
  score: number; // 0-100
  uptime: number; // percentage
  incidentFrequency: number; // incidents per 30 days
  avgResolutionTime: number; // minutes
}

export interface TrendData {
  date: string;
  incidents: number;
  criticalIncidents: number;
  majorIncidents: number;
  minorIncidents: number;
}

export interface SLAData {
  serviceId: string;
  serviceName: string;
  slug: string;
  period: string;
  uptime: number;
  target: number;
  met: boolean;
  downtime: number; // in minutes
}

export class AnalyticsService {
  /**
   * Calculate Mean Time To Resolution (MTTR)
   * Average time from incident start to resolution
   */
  async calculateMTTR(serviceId?: string, days: number = 30): Promise<MTTRData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = {
      startedAt: { gte: startDate },
      resolvedAt: { not: null },
      ...(serviceId && { serviceId }),
    };

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        service: true,
      },
    });

    // Group by service
    const serviceMap = new Map<string, {
      service: any;
      incidents: typeof incidents;
      totalResolutionTime: number;
    }>();

    for (const incident of incidents) {
      if (!incident.resolvedAt) continue;

      const resolutionTime = incident.resolvedAt.getTime() - incident.startedAt.getTime();
      const resolutionMinutes = resolutionTime / (1000 * 60);

      const existing = serviceMap.get(incident.serviceId);
      if (existing) {
        existing.incidents.push(incident);
        existing.totalResolutionTime += resolutionMinutes;
      } else {
        serviceMap.set(incident.serviceId, {
          service: incident.service,
          incidents: [incident],
          totalResolutionTime: resolutionMinutes,
        });
      }
    }

    // Calculate MTTR for each service
    const results: MTTRData[] = [];
    for (const [serviceId, data] of serviceMap) {
      const resolvedCount = data.incidents.length;
      const mttr = resolvedCount > 0 ? data.totalResolutionTime / resolvedCount : 0;

      results.push({
        serviceId,
        serviceName: data.service.name,
        slug: data.service.slug,
        mttr: Math.round(mttr * 100) / 100,
        totalIncidents: resolvedCount,
        resolvedIncidents: resolvedCount,
      });
    }

    return results.sort((a, b) => b.mttr - a.mttr); // Highest MTTR first
  }

  /**
   * Calculate Mean Time To Detection (MTTD)
   * Average time from actual incident start to creation in system
   * (Assumes incidents are detected and created within reasonable time)
   */
  async calculateMTTD(serviceId?: string, days: number = 30): Promise<MTTDData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = {
      startedAt: { gte: startDate },
      ...(serviceId && { serviceId }),
    };

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        service: true,
      },
    });

    // Group by service
    const serviceMap = new Map<string, {
      service: any;
      detectionTimes: number[];
    }>();

    for (const incident of incidents) {
      // Detection time = createdAt - startedAt
      const detectionTime = incident.createdAt.getTime() - incident.startedAt.getTime();
      const detectionMinutes = Math.max(0, detectionTime / (1000 * 60));

      const existing = serviceMap.get(incident.serviceId);
      if (existing) {
        existing.detectionTimes.push(detectionMinutes);
      } else {
        serviceMap.set(incident.serviceId, {
          service: incident.service,
          detectionTimes: [detectionMinutes],
        });
      }
    }

    // Calculate MTTD for each service
    const results: MTTDData[] = [];
    for (const [serviceId, data] of serviceMap) {
      const totalDetectionTime = data.detectionTimes.reduce((sum, time) => sum + time, 0);
      const mttd = data.detectionTimes.length > 0 ? totalDetectionTime / data.detectionTimes.length : 0;

      results.push({
        serviceId,
        serviceName: data.service.name,
        slug: data.service.slug,
        mttd: Math.round(mttd * 100) / 100,
        totalIncidents: data.detectionTimes.length,
      });
    }

    return results.sort((a, b) => b.mttd - a.mttd); // Highest MTTD first
  }

  /**
   * Calculate Service Reliability Score (0-100)
   * Based on: uptime (40%), incident frequency (30%), avg resolution time (30%)
   */
  async calculateReliabilityScore(serviceId?: string, days: number = 30): Promise<ReliabilityScore[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = serviceId ? { id: serviceId, isActive: true } : { isActive: true };

    const services = await prisma.service.findMany({
      where,
      include: {
        statusChecks: {
          where: {
            checkedAt: { gte: startDate },
          },
        },
        incidents: {
          where: {
            startedAt: { gte: startDate },
          },
        },
      },
    });

    const results: ReliabilityScore[] = [];

    for (const service of services) {
      // 1. Calculate uptime (40% weight)
      const totalChecks = service.statusChecks.length;
      const upChecks = service.statusChecks.filter(c => c.isUp).length;
      const uptime = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;
      const uptimeScore = (uptime / 100) * 40;

      // 2. Calculate incident frequency (30% weight)
      // Lower frequency = higher score
      const incidentCount = service.incidents.length;
      const incidentsPerDay = incidentCount / days;
      let frequencyScore = 0;

      if (incidentsPerDay === 0) {
        frequencyScore = 30;
      } else if (incidentsPerDay < 0.1) { // < 3 incidents per month
        frequencyScore = 25;
      } else if (incidentsPerDay < 0.5) { // < 15 incidents per month
        frequencyScore = 20;
      } else if (incidentsPerDay < 1) { // < 30 incidents per month
        frequencyScore = 15;
      } else {
        frequencyScore = Math.max(0, 10 - incidentsPerDay);
      }

      // 3. Calculate average resolution time (30% weight)
      // Faster resolution = higher score
      const resolvedIncidents = service.incidents.filter(i => i.resolvedAt);
      let avgResolutionMinutes = 0;
      let resolutionScore = 0;

      if (resolvedIncidents.length > 0) {
        const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
          if (!incident.resolvedAt) return sum;
          return sum + (incident.resolvedAt.getTime() - incident.startedAt.getTime());
        }, 0);

        avgResolutionMinutes = totalResolutionTime / (resolvedIncidents.length * 1000 * 60);

        // Score based on resolution time
        if (avgResolutionMinutes < 15) {
          resolutionScore = 30;
        } else if (avgResolutionMinutes < 60) {
          resolutionScore = 25;
        } else if (avgResolutionMinutes < 240) { // 4 hours
          resolutionScore = 20;
        } else if (avgResolutionMinutes < 1440) { // 24 hours
          resolutionScore = 15;
        } else {
          resolutionScore = 10;
        }
      } else {
        // No incidents to resolve
        resolutionScore = 30;
      }

      const totalScore = Math.round(uptimeScore + frequencyScore + resolutionScore);

      results.push({
        serviceId: service.id,
        serviceName: service.name,
        slug: service.slug,
        score: Math.min(100, totalScore),
        uptime: Math.round(uptime * 100) / 100,
        incidentFrequency: Math.round(incidentsPerDay * 30 * 100) / 100, // per 30 days
        avgResolutionTime: Math.round(avgResolutionMinutes * 100) / 100,
      });
    }

    return results.sort((a, b) => b.score - a.score); // Highest score first
  }

  /**
   * Get incident trends over time
   */
  async getIncidentTrends(serviceId?: string, days: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = {
      startedAt: { gte: startDate },
      ...(serviceId && { serviceId }),
    };

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { startedAt: 'asc' },
    });

    // Group by date
    const dateMap = new Map<string, {
      total: number;
      critical: number;
      major: number;
      minor: number;
    }>();

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { total: 0, critical: 0, major: 0, minor: 0 });
    }

    // Count incidents per date
    for (const incident of incidents) {
      const dateStr = incident.startedAt.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);

      if (data) {
        data.total++;

        if (incident.severity === 'critical') {
          data.critical++;
        } else if (incident.severity === 'major') {
          data.major++;
        } else if (incident.severity === 'minor') {
          data.minor++;
        }
      }
    }

    // Convert to array
    const results: TrendData[] = [];
    for (const [date, data] of dateMap) {
      results.push({
        date,
        incidents: data.total,
        criticalIncidents: data.critical,
        majorIncidents: data.major,
        minorIncidents: data.minor,
      });
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate SLA compliance
   * Default targets: 99.9% for production, 99% for custom
   */
  async calculateSLA(
    serviceId?: string,
    period: 'day' | 'week' | 'month' | 'quarter' = 'month',
    target: number = 99.9
  ): Promise<SLAData[]> {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const where = serviceId ? { id: serviceId, isActive: true } : { isActive: true };

    const services = await prisma.service.findMany({
      where,
      include: {
        statusChecks: {
          where: {
            checkedAt: { gte: startDate },
          },
        },
      },
    });

    const results: SLAData[] = [];

    for (const service of services) {
      const totalChecks = service.statusChecks.length;
      const upChecks = service.statusChecks.filter(c => c.isUp).length;
      const uptime = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;

      // Calculate downtime in minutes
      const totalMinutes = (now.getTime() - startDate.getTime()) / (1000 * 60);
      const downtime = totalMinutes * (1 - uptime / 100);

      results.push({
        serviceId: service.id,
        serviceName: service.name,
        slug: service.slug,
        period,
        uptime: Math.round(uptime * 100) / 100,
        target,
        met: uptime >= target,
        downtime: Math.round(downtime * 100) / 100,
      });
    }

    return results.sort((a, b) => b.uptime - a.uptime);
  }

  /**
   * Get summary analytics for dashboard
   */
  async getSummaryAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalIncidents,
      activeIncidents,
      totalServices,
      mttrData,
      mttdData,
      reliabilityData,
    ] = await Promise.all([
      // Total incidents
      prisma.incident.count({
        where: { startedAt: { gte: startDate } },
      }),

      // Active incidents
      prisma.incident.count({
        where: {
          startedAt: { gte: startDate },
          resolvedAt: null,
        },
      }),

      // Total active services
      prisma.service.count({
        where: { isActive: true },
      }),

      // Average MTTR
      this.calculateMTTR(undefined, days),

      // Average MTTD
      this.calculateMTTD(undefined, days),

      // Average reliability score
      this.calculateReliabilityScore(undefined, days),
    ]);

    const avgMTTR = mttrData.length > 0
      ? mttrData.reduce((sum, d) => sum + d.mttr, 0) / mttrData.length
      : 0;

    const avgMTTD = mttdData.length > 0
      ? mttdData.reduce((sum, d) => sum + d.mttd, 0) / mttdData.length
      : 0;

    const avgReliability = reliabilityData.length > 0
      ? reliabilityData.reduce((sum, d) => sum + d.score, 0) / reliabilityData.length
      : 100;

    return {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      metrics: {
        totalIncidents,
        activeIncidents,
        resolvedIncidents: totalIncidents - activeIncidents,
        totalServices,
        avgMTTR: Math.round(avgMTTR * 100) / 100,
        avgMTTD: Math.round(avgMTTD * 100) / 100,
        avgReliabilityScore: Math.round(avgReliability * 100) / 100,
      },
      topPerformers: reliabilityData.slice(0, 5),
      needsAttention: reliabilityData.slice(-5).reverse(),
    };
  }
}
