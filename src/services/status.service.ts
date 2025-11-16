import axios from 'axios';
import * as cheerio from 'cheerio';
import { StatusParser } from './parsers/status-parser';
import { execSync } from 'child_process';

// Simple SQLite wrapper using sqlite3 CLI
class SimplePrisma {
  private dbPath = './prisma/dev.db';

  query(sql: string): any[] {
    try {
      const result = execSync(`sqlite3 ${this.dbPath} "${sql}"`, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return this.parseResult(result);
    } catch (error) {
      console.error('Database query error:', error);
      return [];
    }
  }

  queryOne(sql: string): any | null {
    const results = this.query(sql);
    return results.length > 0 ? results[0] : null;
  }

  exec(sql: string): void {
    try {
      execSync(`sqlite3 ${this.dbPath} "${sql}"`, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      console.error('Database exec error:', error);
    }
  }

  private parseResult(result: string): any[] {
    if (!result || result.trim() === '') return [];
    
    const lines = result.trim().split('\n');
    return lines.map(line => {
      const parts = line.split('|');
      return {
        id: parts[0],
        name: parts[1],
        slug: parts[2],
        category: parts[3],
        statusUrl: parts[4],
        logoUrl: parts[5],
        color: parts[6],
        isActive: parts[7] === '1',
        createdAt: new Date(parts[8]),
        updatedAt: new Date(parts[9])
      };
    });
  }
}

const prisma = new SimplePrisma();

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
    const serviceResult = prisma.queryOne(`SELECT * FROM Service WHERE slug='${slug}'`);

    if (!serviceResult) {
      throw new Error(`Service not found: ${slug}`);
    }

    const service = serviceResult;
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

      // Save status check to database
      const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const message = (status.message || '').replace(/'/g, "''"); // Escape single quotes
      
      prisma.exec(
        `INSERT INTO StatusCheck (id, serviceId, status, responseTime, message, checkedAt) 
         VALUES ('${checkId}', '${service.id}', '${status.status}', ${responseTime}, '${message}', datetime('now'))`
      );

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
      const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const errorMsg = (error instanceof Error ? error.message : 'Unknown error').replace(/'/g, "''");
      
      prisma.exec(
        `INSERT INTO StatusCheck (id, serviceId, status, responseTime, message, checkedAt) 
         VALUES ('${checkId}', '${service.id}', 'unknown', ${Date.now() - startTime}, '${errorMsg}', datetime('now'))`
      );

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
    const services = prisma.query("SELECT * FROM Service WHERE isActive=1");

    const statusChecks = await Promise.all(
      services.map(service => this.checkServiceStatus(service.slug))
    );

    return statusChecks;
  }

  async forceRefresh(slug: string): Promise<ServiceStatus> {
    return this.checkServiceStatus(slug);
  }

  async getLatestStatus(slug: string): Promise<ServiceStatus | null> {
    const service = prisma.queryOne(`SELECT * FROM Service WHERE slug='${slug}'`);

    if (!service) {
      return null;
    }

    // Get latest status check
    const result = execSync(
      `sqlite3 ${prisma['dbPath']} "SELECT * FROM StatusCheck WHERE serviceId='${service.id}' ORDER BY checkedAt DESC LIMIT 1"`,
      { encoding: 'utf-8' }
    );

    if (!result || result.trim() === '') {
      return null;
    }

    const parts = result.trim().split('|');
    const latestCheck = {
      status: parts[2],
      responseTime: parts[3] ? parseInt(parts[3]) : null,
      message: parts[4],
      checkedAt: new Date(parts[5])
    };

    return {
      slug: service.slug,
      name: service.name,
      status: latestCheck.status as any,
      message: latestCheck.message || undefined,
      lastChecked: latestCheck.checkedAt,
      responseTime: latestCheck.responseTime || undefined
    };
  }
}