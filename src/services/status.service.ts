import axios from 'axios';
import { StatusParser } from './parsers/status.parser';
import { PrismaClient } from '@prisma/client';

// Use PrismaClient to interact with the configured DATABASE_URL (Postgres in dev)
const prisma = new PrismaClient();

export interface ServiceStatus {
  slug: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
  message?: string;
  lastChecked: Date;
  responseTime?: number;
  incidents?: Array<{
    title: string;
    status: string;
    impact: string;
    created: Date;
  }>;
}

export class StatusService {
  private parser: StatusParser;
  private retryAttempts: number;
  private retryDelayMs: number;

  constructor() {
    this.parser = new StatusParser();
    this.retryAttempts = Number(process.env.DB_RETRY_ATTEMPTS ?? process.env.RETRY_ATTEMPTS ?? 5);
    this.retryDelayMs = Number(process.env.DB_RETRY_DELAY_MS ?? process.env.RETRY_DELAY_MS ?? 300);
  }

  // Simple retry helper with exponential backoff
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

  async checkServiceStatus(slug: string): Promise<ServiceStatus> {
    const service = await prisma.service.findUnique({
      where: { slug },
    });

    if (!service) {
      throw new Error(`Service not found: ${slug}`);
    }
    const startTime = Date.now();
    
    try {
      const response = await axios.get(service.statusUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'StatusWatch/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      const html = response.data;

      // Parse the status page based on the service
      const status = await this.parser.parse(slug, html);

      // Map parsed status to boolean isUp used by Prisma StatusCheck
      const isUp = status.status === 'operational';

      await this.retry(() => prisma.statusCheck.create({
        data: {
          serviceId: service.id,
          isUp,
          responseTime: responseTime,
          statusCode: (response && response.status) ? response.status : null,
          checkedAt: new Date()
        }
      }), this.retryAttempts, this.retryDelayMs);

      return {
        slug: service.slug,
        name: service.name,
        status: status.status,
        message: status.message,
        lastChecked: new Date(),
        responseTime,
        incidents: status.incidents
      };
    } catch (error) {
      console.error(`Error checking ${service.name}:`, error);
      
      // Save failed check
      const responseTime = Date.now() - startTime;
      try {
        await this.retry(() => prisma.statusCheck.create({
          data: {
            serviceId: service.id,
            isUp: false,
            responseTime,
            statusCode: null,
            checkedAt: new Date()
          }
        }), this.retryAttempts, this.retryDelayMs);
      } catch (err) {
        // If even retries fail, log and move on — don't throw from cron tasks
        console.error('Failed to persist failed statusCheck after retries:', err);
      }

      return {
        slug: service.slug,
        name: service.name,
        status: 'unknown',
        message: 'Failed to fetch status',
        lastChecked: new Date()
      };
    }
  }

  async checkAllServices(): Promise<ServiceStatus[]> {
    const services = await prisma.service.findMany({ where: { isActive: true } });

    const statusChecks = await Promise.all(
      services.map(svc => this.checkServiceStatus(svc.slug))
    );

    return statusChecks;
  }

  async forceRefresh(slug: string): Promise<ServiceStatus> {
    return this.checkServiceStatus(slug);
  }

  async getLatestStatus(slug: string): Promise<ServiceStatus | null> {
    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service) return null;

    const latestCheck = await prisma.statusCheck.findFirst({
      where: { serviceId: service.id },
      orderBy: { checkedAt: 'desc' }
    });

    if (!latestCheck) return null;

    return {
      slug: service.slug,
      name: service.name,
      status: latestCheck.isUp ? 'operational' : 'degraded',
      message: undefined,
      lastChecked: latestCheck.checkedAt,
      responseTime: latestCheck.responseTime || undefined
    };
  }
}