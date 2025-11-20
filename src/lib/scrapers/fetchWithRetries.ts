import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface FetchRetryOptions {
  retries?: number;
  backoffMs?: number; // initial backoff in ms
}

export async function fetchWithRetries<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  opts: FetchRetryOptions = {}
): Promise<AxiosResponse<T>> {
  const retries = typeof opts.retries === 'number' ? opts.retries : 3;
  const backoffMs = typeof opts.backoffMs === 'number' ? opts.backoffMs : 500;

  let attempt = 0;
  while (true) {
    try {
      return await axios.get<T>(url, config);
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        // rethrow the last error after exhausting retries
        throw err;
      }
      // exponential backoff with small jitter
      const delay = backoffMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

export default fetchWithRetries;
