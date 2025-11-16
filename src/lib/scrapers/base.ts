// Base scraper interface
export interface StatusData {
  isUp: boolean;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  incidents: IncidentData[];
  lastChecked: Date;
}

export interface IncidentData {
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'critical' | 'major' | 'minor' | 'maintenance';
  startedAt: Date;
  updates: {
    message: string;
    createdAt: Date;
  }[];
}

export abstract class StatusScraper {
  abstract serviceName: string;
  abstract serviceUrl: string;
  
  abstract scrape(): Promise<StatusData>;
  
  protected async fetchPage(url: string): Promise<string> {
    const axios = require('axios');
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'StatusWatch/1.0'
      }
    });
    return response.data;
  }
}