import { StatusScraper, StatusData, IncidentData } from './base';
import axios from 'axios';

export class AWSStatusScraper extends StatusScraper {
  serviceName = 'AWS';
  serviceUrl = 'https://status.aws.amazon.com/data.json';
  
  async scrape(): Promise<StatusData> {
    try {
      const response = await axios.get(this.serviceUrl);
  const data: unknown = response.data;

  // AWS has complex JSON structure
  type AwsIssue = { summary?: string; details?: string; severity?: number; date?: number };
  type AwsData = { current?: AwsIssue[] };
  const ad = data as AwsData | undefined;
  const currentIssues = Array.isArray(ad?.current) ? ad!.current! : [];
      const isUp = currentIssues.length === 0;

      const incidents: IncidentData[] = currentIssues.map((issue: AwsIssue) => ({
        title: issue.summary || 'AWS Service Issue',
        description: issue.details || '',
        status: 'identified',
        severity: this.mapSeverity(typeof issue.severity === 'number' ? issue.severity : 1),
        startedAt: issue.date ? new Date(issue.date * 1000) : new Date(),
        updates: [{
          message: issue.details || '',
          createdAt: issue.date ? new Date(issue.date * 1000) : new Date()
        }]
      }));
      
      return {
        isUp,
        status: isUp ? 'operational' : 'degraded',
        incidents,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('AWS scraper error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  private mapSeverity(severity: number): 'critical' | 'major' | 'minor' {
    if (severity >= 4) return 'critical';
    if (severity >= 2) return 'major';
    return 'minor';
  }
}