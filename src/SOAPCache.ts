import { KeyValueCache } from 'apollo-server-caching';

interface S3CacheOptions {
  ttl?: number;
}

interface Params {
  method: string;
  args: any;
}

export class SOAPCache {
  private options: S3CacheOptions = { ttl: 300 };

  constructor(private keyValueCache: KeyValueCache, options?: S3CacheOptions) {
    this.options = { ...this.options, ...options };
  }

  cacheKey(params: Params) {
    return `${params.method}:${JSON.stringify(params.args)}`;
  }

  async get(params: Params) {
    const item = await this.keyValueCache.get(this.cacheKey(params));
    if (item) {
      return JSON.parse(item);
    }
  }

  async set(params: Params, response: any) {
    return await this.keyValueCache.set(this.cacheKey(params), JSON.stringify(response), { ttl: this.options.ttl });
  }
}
