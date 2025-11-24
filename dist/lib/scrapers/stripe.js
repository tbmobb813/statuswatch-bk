"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeStatusScraper = void 0;
const base_1 = require("./base");
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
class StripeStatusScraper extends base_1.StatusScraper {
    constructor() {
        super(...arguments);
        this.serviceName = 'Stripe';
        this.serviceUrl = 'https://status.stripe.com/api/v2/status.json';
    }
    async scrape() {
        var _a, _b, _c, _d;
        try {
            // Try JSON status API first
            let data = null;
            try {
                const response = await axios_1.default.get(this.serviceUrl, { timeout: 8000 });
                // If content-type is JSON, parse it
                const ct = response.headers['content-type'] || '';
                if (ct.includes('application/json') || ct.includes('application/vnd')) {
                    data = response.data;
                }
                else {
                    // Non-JSON response (HTML) - fall through to HTML parsing below
                    data = null;
                }
            }
            catch {
                // If JSON endpoint not found, we'll try HTML scraping
                data = null;
            }
            if (data && typeof data === 'object') {
                // Narrow the JSON shape safely
                const d = data;
                const isUp = ((_a = d.status) === null || _a === void 0 ? void 0 : _a.indicator) === 'none';
                const status = this.mapStatus(((_b = d.status) === null || _b === void 0 ? void 0 : _b.indicator) || 'none');
                // Try incidents JSON, if available
                const incidents = [];
                try {
                    const incidentsRes = await axios_1.default.get('https://status.stripe.com/api/v2/incidents.json');
                    const list = Array.isArray((_c = incidentsRes.data) === null || _c === void 0 ? void 0 : _c.incidents) ? incidentsRes.data.incidents : [];
                    for (const inc of list) {
                        if (inc.status === 'resolved')
                            continue;
                        const updatesRaw = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
                        const updates = updatesRaw.map((u) => {
                            const ur = u;
                            return { message: ur.body || '', createdAt: ur.created_at ? new Date(ur.created_at) : new Date() };
                        });
                        incidents.push({
                            title: inc.name || 'Stripe incident',
                            description: ((_d = updates[0]) === null || _d === void 0 ? void 0 : _d.message) || '',
                            status: this.mapIncidentStatus(inc.status) || 'investigating',
                            severity: this.mapSeverity(inc.impact) || 'minor',
                            startedAt: inc.created_at ? new Date(inc.created_at) : new Date(),
                            updates
                        });
                    }
                }
                catch {
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
            const htmlRes = await axios_1.default.get('https://status.stripe.com', { timeout: 8000 });
            const html = String(htmlRes.data || '');
            const $ = (0, cheerio_1.load)(html);
            // Basic heuristics: look for an element indicating overall status
            const banner = $('.StatusSiteReachabilitySection .title').first().text().trim() || $('h1.title').first().text().trim();
            const isUp = /oops|down|maintenance/i.test(banner) ? false : true;
            const status = isUp ? 'operational' : 'degraded';
            // Attempt to extract recent incidents from HTML (simple fallback)
            const incidents = [];
            $('.incident').each((i, el) => {
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
                status: status,
                incidents,
                lastChecked: new Date()
            };
        }
        catch (error) {
            console.error('Stripe scraper error:', error.message || String(error));
            throw error;
        }
    }
    mapStatus(indicator) {
        const map = {
            'none': 'operational',
            'minor': 'degraded',
            'major': 'outage',
            'critical': 'outage'
        };
        return map[indicator] || 'operational';
    }
    mapIncidentStatus(status) {
        const map = {
            'investigating': 'investigating',
            'identified': 'identified',
            'monitoring': 'monitoring',
            'resolved': 'resolved'
        };
        return map[status] || 'investigating';
    }
    mapSeverity(impact) {
        const map = {
            'none': 'minor',
            'minor': 'minor',
            'major': 'major',
            'critical': 'critical',
            'maintenance': 'maintenance'
        };
        return map[impact] || 'minor';
    }
}
exports.StripeStatusScraper = StripeStatusScraper;
