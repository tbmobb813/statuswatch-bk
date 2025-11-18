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

  constructor() {
    this.parser = new StatusParser();
  }

  async checkServiceStatus(slug: string): Promise<ServiceStatus> {
    const service = await prisma.service.findUnique({
      where: { slug },
    });

    if (!service) {
      throw new Error(`Service not found: ${slug}`);
    }

    // Check if this is a custom service - use different logic
    if (service.isCustom) {
      return this.checkCustomService(service);
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

      await prisma.statusCheck.create({
        data: {
          serviceId: service.id,
          isUp,
          responseTime: responseTime,
          statusCode: (response && response.status) ? response.status : null,
          checkedAt: new Date()
        }
      });

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
      await prisma.statusCheck.create({
        data: {
          serviceId: service.id,
          isUp: false,
          responseTime,
          statusCode: null,
          checkedAt: new Date()
        }
      });

      return {
        slug: service.slug,
        name: service.name,
        status: 'unknown',
        message: 'Failed to fetch status',
        lastChecked: new Date()
      };
    }
  }

  // Check custom service - simpler logic, just HTTP status code
  private async checkCustomService(service: any): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      const response = await axios({
        method: 'GET',
        url: service.statusUrl,
        timeout: service.responseTimeThreshold || 10000,
        validateStatus: () => true, // Don't throw on any status code
        headers: {
          'User-Agent': 'StatusWatch/1.0'
        },
        maxRedirects: 5,
      });

      const responseTime = Date.now() - startTime;

      // Check if status code matches expected
      const isUp = response.status === service.expectedStatusCode;

      // Check if response time is within threshold
      const isSlowResponse = responseTime > service.responseTimeThreshold;

      // Determine status
      let status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
      let message: string;

      if (isUp && !isSlowResponse) {
        status = 'operational';
        message = `Service is up (${response.status})`;
      } else if (isUp && isSlowResponse) {
        status = 'degraded';
        message = `Service is slow (${responseTime}ms > ${service.responseTimeThreshold}ms threshold)`;
      } else {
        status = 'major_outage';
        message = `Service returned ${response.status}, expected ${service.expectedStatusCode}`;
      }

      // Save check result
      await prisma.statusCheck.create({
        data: {
          serviceId: service.id,
          isUp: isUp && !isSlowResponse,
          responseTime,
          statusCode: response.status,
          checkedAt: new Date()
        }
      });

      return {
        slug: service.slug,
        name: service.name,
        status,
        message,
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error) {
      console.error(`Error checking custom service ${service.name}:`, error);

      // Save failed check
      const responseTime = Date.now() - startTime;
      await prisma.statusCheck.create({
        data: {
          serviceId: service.id,
          isUp: false,
          responseTime,
          statusCode: null,
          checkedAt: new Date()
        }
      });

      return {
        slug: service.slug,
        name: service.name,
        status: 'major_outage',
        message: error instanceof Error ? error.message : 'Failed to connect',
        lastChecked: new Date(),
        responseTime,
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