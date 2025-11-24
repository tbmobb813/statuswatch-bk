"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusScraper = void 0;
const axios_1 = __importDefault(require("axios"));
class StatusScraper {
    async fetchPage(url) {
        const response = await axios_1.default.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'StatusWatch/1.0'
            }
        });
        return response.data;
    }
}
exports.StatusScraper = StatusScraper;
