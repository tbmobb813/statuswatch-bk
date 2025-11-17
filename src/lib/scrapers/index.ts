import { GitHubStatusScraper } from './github';
import { AWSStatusScraper } from './aws';
import { VercelStatusScraper } from './vercel';
import { StripeStatusScraper } from './stripe';
import { OpenAIStatusScraper } from './openai';

export const scrapers = {
  github: new GitHubStatusScraper(),
  aws: new AWSStatusScraper(),
  vercel: new VercelStatusScraper(),
  stripe: new StripeStatusScraper(),
  openai: new OpenAIStatusScraper(),
  // We'll add more as we go
};

export type ServiceSlug = keyof typeof scrapers;