import { StatusScraper, StatusData, IncidentData } from './base';
import { fetchWithRetries } from './fetchWithRetries';
import { load } from 'cheerio';

export class StripeStatusScraper extends StatusScraper {
  serviceName = 'Stripe';
  serviceUrl = 'https://status.stripe.com/api/v2/status.json';

  async scrape(): Promise<StatusData> {
    try {
      // Try JSON status API first
      let data: unknown = null;
      try {
        const response = await fetchWithRetries(this.serviceUrl, { timeout: 8000 }, { retries: 3, backoffMs: 400 });
        // If content-type is JSON, parse it
        const ct = response.headers['content-type'] || '';
        if (ct.includes('application/json') || ct.includes('application/vnd')) {
          data = response.data;
        } else {
          // Non-JSON response (HTML) - fall through to HTML parsing below
          data = null;
        }
      } catch {
        // If JSON endpoint not found, we'll try HTML scraping
        data = null;
      }

      if (data && typeof data === 'object') {
        // Narrow the JSON shape safely
        const d = data as { status?: { indicator?: string } };
        const isUp = d.status?.indicator === 'none';
        const status = this.mapStatus(d.status?.indicator || 'none');

        // Try incidents JSON, if available
        const incidents: IncidentData[] = [];
        try {
    const incidentsRes = await fetchWithRetries('https://status.stripe.com/api/v2/incidents.json', { timeout: 8000 }, { retries: 2, backoffMs: 300 });
          const list = Array.isArray(incidentsRes.data?.incidents) ? incidentsRes.data.incidents : [];
          for (const inc of list) {
            if (inc.status === 'resolved') continue;
            const updatesRaw = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
            const updates = updatesRaw.map((u: unknown) => {
              const ur = u as { body?: string; created_at?: string };
              return { message: ur.body || '', createdAt: ur.created_at ? new Date(ur.created_at) : new Date() };
            });
            incidents.push({
              title: inc.name || 'Stripe incident',
              description: updates[0]?.message || '',
              status: (this.mapIncidentStatus(inc.status) as IncidentData['status']) || 'investigating',
              severity: (this.mapSeverity(inc.impact) as IncidentData['severity']) || 'minor',
              startedAt: inc.created_at ? new Date(inc.created_at) : new Date(),
              updates
            });
          }
        } catch {
          // leave incidents empty on any failure
        }

        return {
          isUp,
          status,
          incidents,
          lastChecked: new Date()
        };
      }

      // Fallback: scrape HTML status page
  const htmlRes = await fetchWithRetries('https://status.stripe.com', { timeout: 8000 }, { retries: 3, backoffMs: 400 });
  const html = String(htmlRes.data || '');
  const $ = load(html);

      // Basic heuristics: look for an element indicating overall status
      const banner = $('.StatusSiteReachabilitySection .title').first().text().trim() || $('h1.title').first().text().trim();
      const isUp = /oops|down|maintenance/i.test(banner) ? false : true;
      const status = isUp ? 'operational' : 'degraded';

      // Attempt to extract recent incidents from HTML (simple fallback)
      const incidents: IncidentData[] = [];
      $('.incident').each((i: number, el) => {
        const title = $(el).find('.incident__name').text().trim() || $(el).find('h3').text().trim();
        const desc = $(el).find('.incident__updates').text().trim() || '';
        incidents.push({
          title: title || 'Stripe incident',
          description: desc,
          status: 'investigating',
          severity: 'major',
          startedAt: new Date(),
          updates: [{ message: desc, createdAt: new Date() }]
        });
      });

      return {
        isUp,
        status: status as StatusData['status'],
        incidents,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Stripe scraper error:', (error as Error).message || String(error));
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
