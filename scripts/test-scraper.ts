import { GitHubStatusScraper } from '../src/lib/scrapers/github';

async function test() {
  console.log('Testing GitHub scraper...');
  
  const scraper = new GitHubStatusScraper();
  const result = await scraper.scrape();
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

test();