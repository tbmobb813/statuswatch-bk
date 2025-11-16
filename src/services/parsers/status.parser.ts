import * as cheerio from 'cheerio';

interface ParsedStatus {
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
  message?: string;
  incidents?: Array<{
    title: string;
    status: string;
    impact: string;
    created: Date;
  }>;
}

export class StatusParser {
  async parse(slug: string, html: string): Promise<ParsedStatus> {
    const $ = cheerio.load(html);

    switch (slug) {
      case 'github':
        return this.parseGitHub($);
      case 'aws':
        return this.parseAWS($);
      case 'vercel':
        return this.parseVercel($);
      case 'stripe':
        return this.parseStripe($);
      case 'openai':
        return this.parseOpenAI($);
      default:
        return this.parseGeneric($);
    }
  }

  private parseGitHub($: cheerio.CheerioAPI): ParsedStatus {
    // GitHub uses statuspage.io
    const status = $('.status').first().text().trim().toLowerCase();
    const message = $('.page-status .status').text().trim();

    // Check for incidents
    const incidents: any[] = [];
    $('.unresolved-incident').each((i, el) => {
      const title = $(el).find('.incident-title').text().trim();
      const impact = $(el).find('.impact-description').text().trim();
      incidents.push({
        title,
        status: 'investigating',
        impact,
        created: new Date()
      });
    });

    let statusLevel: ParsedStatus['status'] = 'operational';
    
    if (status.includes('all systems operational')) {
      statusLevel = 'operational';
    } else if (status.includes('minor') || status.includes('degraded')) {
      statusLevel = 'degraded';
    } else if (status.includes('partial')) {
      statusLevel = 'partial_outage';
    } else if (status.includes('major')) {
      statusLevel = 'major_outage';
    }

    return {
      status: statusLevel,
      message,
      incidents: incidents.length > 0 ? incidents : undefined
    };
  }

  private parseAWS($: cheerio.CheerioAPI): ParsedStatus {
    // AWS Health Dashboard
    const statusText = $('body').text().toLowerCase();
    
    // Look for service health indicators
    if (statusText.includes('service is operating normally')) {
      return {
        status: 'operational',
        message: 'All services operating normally'
      };
    } else if (statusText.includes('degraded') || statusText.includes('performance issues')) {
      return {
        status: 'degraded',
        message: 'Some services experiencing degraded performance'
      };
    } else if (statusText.includes('service disruption')) {
      return {
        status: 'partial_outage',
        message: 'Service disruption detected'
      };
    }

    return {
      status: 'operational',
      message: 'Service operational'
    };
  }

  private parseVercel($: cheerio.CheerioAPI): ParsedStatus {
    // Vercel uses statuspage.io
    const indicator = $('.page-status-indicator').text().trim().toLowerCase();
    const message = $('.status-description').text().trim();

    let status: ParsedStatus['status'] = 'operational';

    if (indicator.includes('operational')) {
      status = 'operational';
    } else if (indicator.includes('degraded')) {
      status = 'degraded';
    } else if (indicator.includes('partial')) {
      status = 'partial_outage';
    } else if (indicator.includes('major')) {
      status = 'major_outage';
    }

    return {
      status,
      message: message || 'All Systems Operational'
    };
  }

  private parseStripe($: cheerio.CheerioAPI): ParsedStatus {
    // Stripe's status page
    const statusText = $('.current-status').text().trim().toLowerCase();
    
    if (statusText.includes('all systems normal') || statusText.includes('operational')) {
      return {
        status: 'operational',
        message: 'All systems operational'
      };
    } else if (statusText.includes('degraded')) {
      return {
        status: 'degraded',
        message: 'Degraded performance'
      };
    } else if (statusText.includes('outage')) {
      return {
        status: 'major_outage',
        message: 'Service outage'
      };
    }

    return {
      status: 'operational',
      message: 'Service operational'
    };
  }

  private parseOpenAI($: cheerio.CheerioAPI): ParsedStatus {
    // OpenAI status page
    const indicator = $('.page-status span').text().trim().toLowerCase();
    
    if (indicator.includes('operational') || indicator.includes('all systems')) {
      return {
        status: 'operational',
        message: 'All Systems Operational'
      };
    } else if (indicator.includes('degraded')) {
      return {
        status: 'degraded',
        message: 'Degraded Performance'
      };
    } else if (indicator.includes('partial')) {
      return {
        status: 'partial_outage',
        message: 'Partial Outage'
      };
    } else if (indicator.includes('major')) {
      return {
        status: 'major_outage',
        message: 'Major Outage'
      };
    }

    return {
      status: 'operational',
      message: 'All Systems Operational'
    };
  }

  private parseGeneric($: cheerio.CheerioAPI): ParsedStatus {
    // Generic parser for unknown status pages
    const bodyText = $('body').text().toLowerCase();
    
    // Look for common keywords
    if (bodyText.includes('all systems operational') || 
        bodyText.includes('all services operational') ||
        bodyText.includes('no known issues')) {
      return {
        status: 'operational',
        message: 'All systems operational'
      };
    } else if (bodyText.includes('degraded') || 
               bodyText.includes('performance issues')) {
      return {
        status: 'degraded',
        message: 'Degraded performance detected'
      };
    } else if (bodyText.includes('outage') || 
               bodyText.includes('down') ||
               bodyText.includes('unavailable')) {
      return {
        status: 'major_outage',
        message: 'Service outage detected'
      };
    }

    return {
      status: 'unknown',
      message: 'Unable to determine status'
    };
  }
}