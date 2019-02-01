import { InMemoryLRUCache } from 'apollo-server-caching';
import { SOAPCache } from '../src';

describe('S3Cache', () => {
  it('Should generate correct keys', () => {
    const cache = new InMemoryLRUCache();
    const soapCache = new SOAPCache(cache);

    const normal = soapCache.cacheKey({ method: 'test', args: { firstName: 'John' } });
    const nested = soapCache.cacheKey({ method: 'serv.port.test', args: { name: { first: 'John' } } });

    expect(normal).toEqual('test:{"firstName":"John"}');
    expect(nested).toEqual('serv.port.test:{"name":{"first":"John"}}');
  });

  it('Should store and retrieve cache', async () => {
    const cache = new InMemoryLRUCache();
    const soapCache = new SOAPCache(cache);

    const noMatch = await soapCache.get({ method: 'test', args: { firstName: 'John' } });
    await soapCache.set({ method: 'test', args: { firstName: 'John' } }, { myResponse: 'test ' });
    const match = await soapCache.get({ method: 'test', args: { firstName: 'John' } });

    expect(noMatch).toBe(undefined);
    expect(match).toEqual({ myResponse: 'test ' });
  });
});
