import { StatusScraper, StatusData, IncidentData } from './base';
import { fetchWithRetries } from './fetchWithRetries';

export class GitHubStatusScraper extends StatusScraper {
  serviceName = 'GitHub';
  serviceUrl = 'https://www.githubstatus.com/api/v2/status.json';
  
  async scrape(): Promise<StatusData> {
    try {
  const response = await fetchWithRetries(this.serviceUrl, { timeout: 8000 }, { retries: 3, backoffMs: 400 });
      const data: unknown = response.data;

      const d = data as { status?: { indicator?: string } } | undefined;
      // GitHub uses Atlassian Statuspage
      const isUp = !!(d && d.status && d.status.indicator === 'none');
      const status = this.mapStatus(d?.status?.indicator || 'none');

      // Fetch recent incidents
      const incidents: IncidentData[] = [];
      try {
  const incidentsResponse = await fetchWithRetries('https://www.githubstatus.com/api/v2/incidents.json', { timeout: 8000 }, { retries: 2, backoffMs: 300 });
  const list = Array.isArray(incidentsResponse.data?.incidents) ? incidentsResponse.data.incidents : [];
        for (const inc of list) {
          if (inc.status === 'resolved') continue;
          const updatesRaw = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
          const updates = updatesRaw.map((upd: unknown) => {
            const u = upd as { body?: string; created_at?: string };
            return { message: u.body || '', createdAt: u.created_at ? new Date(u.created_at) : new Date() };
          });
          incidents.push({
            title: inc.name || 'GitHub incident',
            description: updates[0]?.message || '',
            status: (this.mapIncidentStatus(inc.status) as IncidentData['status']) || 'investigating',
            severity: (this.mapSeverity(inc.impact) as IncidentData['severity']) || 'minor',
            startedAt: inc.created_at ? new Date(inc.created_at) : new Date(),
            updates
          });
        }
      } catch {
        // ignore
      }
      
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
    const map: Record<string, string> = {
      'investigating': 'investigating',
      'identified': 'identified',
      'monitoring': 'monitoring',
      'resolved': 'resolved'
    };
    return map[status] || 'investigating';
  }
  
  private mapSeverity(impact: string) {
    const map: Record<string, string> = {
      'none': 'minor',
      'minor': 'minor',
      'major': 'major',
      'critical': 'critical',
      'maintenance': 'maintenance'
    };
    return map[impact] || 'minor';
  }
}