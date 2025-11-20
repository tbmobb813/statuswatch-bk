import { StatusScraper, StatusData, IncidentData } from './base';
import { fetchWithRetries } from './fetchWithRetries';

export class OpenAIStatusScraper extends StatusScraper {
  serviceName = 'OpenAI';
  serviceUrl = 'https://status.openai.com/api/v2/status.json';

  async scrape(): Promise<StatusData> {
    try {
  const response = await fetchWithRetries(this.serviceUrl, { timeout: 8000 }, { retries: 3, backoffMs: 400 });
  const data: unknown = response.data;

  const dd = data as { status?: { indicator?: string } } | undefined;
  const isUp = !!(dd && dd.status && dd.status.indicator === 'none');
  const status = this.mapStatus(dd?.status?.indicator || 'none');

      const incidents: IncidentData[] = [];
      try {
  const incidentsRes = await fetchWithRetries('https://status.openai.com/api/v2/incidents.json', { timeout: 8000 }, { retries: 2, backoffMs: 300 });
  const list = Array.isArray(incidentsRes.data?.incidents) ? incidentsRes.data.incidents : [];
        for (const inc of list) {
          if (inc.status === 'resolved') continue;
          const updatesRaw = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
          const updates = updatesRaw.map((u: unknown) => {
            const ur = u as { body?: string; created_at?: string };
            return { message: ur.body || '', createdAt: ur.created_at ? new Date(ur.created_at) : new Date() };
          });
          incidents.push({
            title: inc.name || 'OpenAI incident',
            description: updates[0]?.message || '',
            status: (this.mapIncidentStatus(inc.status) as IncidentData['status']) || 'investigating',
            severity: (this.mapSeverity(inc.impact) as IncidentData['severity']) || 'minor',
            startedAt: inc.created_at ? new Date(inc.created_at) : new Date(),
            updates
          });
        }
      } catch {
        // ignore incidents fetch errors
      }

      return {
        isUp,
        status,
        incidents,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('OpenAI scraper error:', error instanceof Error ? error.message : String(error));
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
