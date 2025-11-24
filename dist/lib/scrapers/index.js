"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapers = void 0;
const github_1 = require("./github");
const aws_1 = require("./aws");
const vercel_1 = require("./vercel");
const stripe_1 = require("./stripe");
const openai_1 = require("./openai");
exports.scrapers = {
    github: new github_1.GitHubStatusScraper(),
    aws: new aws_1.AWSStatusScraper(),
    vercel: new vercel_1.VercelStatusScraper(),
    stripe: new stripe_1.StripeStatusScraper(),
    openai: new openai_1.OpenAIStatusScraper(),
    // We'll add more as we go
};
