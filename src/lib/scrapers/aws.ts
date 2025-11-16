import { StatusScraper, StatusData } from './base';
import axios from 'axios';

export class AWSStatusScraper extends StatusScraper {
  serviceName = 'AWS';
  serviceUrl = 'https://status.aws.amazon.com/data.json';
  
  async scrape(): Promise<StatusData> {
    try {
      const response = await axios.get(this.serviceUrl);
      const data = response.data;
      
      // AWS has complex JSON structure
      const currentIssues = data.current || [];
      const isUp = currentIssues.length === 0;
      
      const incidents = currentIssues.map((issue: any) => ({
        title: issue.summary || 'AWS Service Issue',
        description: issue.details || '',
        status: 'identified' as const,
        severity: this.mapSeverity(issue.severity),
        startedAt: new Date(issue.date * 1000),
        updates: [{
          message: issue.details,
          createdAt: new Date(issue.date * 1000)
        }]
      }));
      
      return {
        isUp,
        status: isUp ? 'operational' : 'degraded',
        incidents,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('AWS scraper error:', error);
      throw error;
    }
  }
  
  private mapSeverity(severity: number): 'critical' | 'major' | 'minor' {
    if (severity >= 4) return 'critical';
    if (severity >= 2) return 'major';
    return 'minor';
  }
}