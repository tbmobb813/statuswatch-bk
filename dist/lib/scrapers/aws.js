"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSStatusScraper = void 0;
const base_1 = require("./base");
const axios_1 = __importDefault(require("axios"));
class AWSStatusScraper extends base_1.StatusScraper {
    constructor() {
        super(...arguments);
        this.serviceName = 'AWS';
        this.serviceUrl = 'https://status.aws.amazon.com/data.json';
    }
    async scrape() {
        try {
            const response = await axios_1.default.get(this.serviceUrl);
            const data = response.data;
            const ad = data;
            const currentIssues = Array.isArray(ad === null || ad === void 0 ? void 0 : ad.current) ? ad.current : [];
            const isUp = currentIssues.length === 0;
            const incidents = currentIssues.map((issue) => ({
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
        }
        catch (error) {
            console.error('AWS scraper error:', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    mapSeverity(severity) {
        if (severity >= 4)
            return 'critical';
        if (severity >= 2)
            return 'major';
        return 'minor';
    }
}
exports.AWSStatusScraper = AWSStatusScraper;
