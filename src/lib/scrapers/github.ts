import { StatusScraper, StatusData } from './base';
import axios from 'axios';

export class GitHubStatusScraper extends StatusScraper {
  serviceName = 'GitHub';
  serviceUrl = 'https://www.githubstatus.com/api/v2/status.json';
  
  async scrape(): Promise<StatusData> {
    try {
      const response = await axios.get(this.serviceUrl);
      const data = response.data;
      
      // GitHub uses Atlassian Statuspage
      const isUp = data.status.indicator === 'none';
      const status = this.mapStatus(data.status.indicator);
      
      // Fetch recent incidents
      const incidentsResponse = await axios.get(
        'https://www.githubstatus.com/api/v2/incidents.json'
      );
      
      const incidents = incidentsResponse.data.incidents
        .filter((inc: any) => inc.status !== 'resolved')
        .map((inc: any) => ({
          title: inc.name,
          description: inc.incident_updates[0]?.body || '',
          status: this.mapIncidentStatus(inc.status),
          severity: this.mapSeverity(inc.impact),
          startedAt: new Date(inc.created_at),
          updates: inc.incident_updates.map((upd: any) => ({
            message: upd.body,
            createdAt: new Date(upd.created_at)
          }))
        }));
      
      return {
        isUp,
        status,
        incidents,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('GitHub scraper error:', error);
      throw error;
    }
  }
  
  private mapStatus(indicator: string): StatusData['status'] {
    const map: Record<string, StatusData['status']> = {
      'none': 'operational',
      'minor': 'degraded',
      'major': 'outage',
      'critical': 'outage'
    };
    return map[indicator] || 'operational';
  }
  
  private mapIncidentStatus(status: string) {
    const map: Record<string, any> = {
      'investigating': 'investigating',
      'identified': 'identified',
      'monitoring': 'monitoring',
      'resolved': 'resolved'
    };
    return map[status] || 'investigating';
  }
  
  private mapSeverity(impact: string) {
    const map: Record<string, any> = {
      'none': 'minor',
      'minor': 'minor',
      'major': 'major',
      'critical': 'critical',
      'maintenance': 'maintenance'
    };
    return map[impact] || 'minor';
  }
}