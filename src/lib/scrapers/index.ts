import { GitHubStatusScraper } from './github';
import { AWSStatusScraper } from './aws';

export const scrapers = {
  github: new GitHubStatusScraper(),
  aws: new AWSStatusScraper(),
  // We'll add more as we go
};

export type ServiceSlug = keyof typeof scrapers;