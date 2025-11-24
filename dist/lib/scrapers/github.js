"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubStatusScraper = void 0;
const base_1 = require("./base");
const axios_1 = __importDefault(require("axios"));
class GitHubStatusScraper extends base_1.StatusScraper {
    constructor() {
        super(...arguments);
        this.serviceName = 'GitHub';
        this.serviceUrl = 'https://www.githubstatus.com/api/v2/status.json';
    }
    async scrape() {
        var _a, _b, _c;
        try {
            const response = await axios_1.default.get(this.serviceUrl);
            const data = response.data;
            const d = data;
            // GitHub uses Atlassian Statuspage
            const isUp = !!(d && d.status && d.status.indicator === 'none');
            const status = this.mapStatus(((_a = d === null || d === void 0 ? void 0 : d.status) === null || _a === void 0 ? void 0 : _a.indicator) || 'none');
            // Fetch recent incidents
            const incidents = [];
            try {
                const incidentsResponse = await axios_1.default.get('https://www.githubstatus.com/api/v2/incidents.json');
                const list = Array.isArray((_b = incidentsResponse.data) === null || _b === void 0 ? void 0 : _b.incidents) ? incidentsResponse.data.incidents : [];
                for (const inc of list) {
                    if (inc.status === 'resolved')
                        continue;
                    const updatesRaw = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
                    const updates = updatesRaw.map((upd) => {
                        const u = upd;
                        return { message: u.body || '', createdAt: u.created_at ? new Date(u.created_at) : new Date() };
                    });
                    incidents.push({
                        title: inc.name || 'GitHub incident',
                        description: ((_c = updates[0]) === null || _c === void 0 ? void 0 : _c.message) || '',
                        status: this.mapIncidentStatus(inc.status) || 'investigating',
                        severity: this.mapSeverity(inc.impact) || 'minor',
                        startedAt: inc.created_at ? new Date(inc.created_at) : new Date(),
                        updates
                    });
                }
            }
            catch {
                // ignore
            }
            return {
                isUp,
                status,
                incidents,
                lastChecked: new Date()
            };
        }
        catch (error) {
            console.error('GitHub scraper error:', error);
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
exports.GitHubStatusScraper = GitHubStatusScraper;
