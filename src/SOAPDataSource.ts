import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { ApolloError } from 'apollo-server-errors';
import { Client, ISecurity, ISoapMethod } from 'soap';
import { SOAPCache } from './';

type ClientCreator = () => Promise<Client>;

export abstract class SOAPDataSource<TContext = any> extends DataSource {
  cache!: SOAPCache;
  private clientCreator: ClientCreator;
  private client: Client;

  constructor(client: Client | ClientCreator) {
    super();
    if (client instanceof Client) {
      this.client = client;
    } else {
      this.clientCreator = client;
    }
  }

  async getClient() {
    if (!this.client) {
      this.client = await this.clientCreator();
    }
    return this.client;
  }

  initialize(config: DataSourceConfig<TContext>): void {
    this.cache = new SOAPCache(config.cache);
  }

  async callFunc<Response = any, Args = any>(method: string, args: Args) {
    const client = await this.getClient();
    return await this.cacheSoapMethodCall<Response>(method, args, client[method] as ISoapMethod);
  }

  async callFullFunc<Response = any, Args = any>(service: string, port: string, method: string, args: Args) {
    const client = await this.getClient();
    const fullMethod = `${service}.${port}.${method}`;
    return this.cacheSoapMethodCall<Response>(fullMethod, args, client[service][port][method]);
  }

  private async cacheSoapMethodCall<Response = any, Args = any>(method: string, args: Args, soapMethod: ISoapMethod) {
    try {
      const cached = await this.cache.get({ method, args });

      if (cached) {
        return cached;
      } else {
        const response = await new Promise<Response>((resolve, reject) =>
          soapMethod(args, (err, result) => (err ? reject(err) : resolve(result))),
        );

        await this.cache.set({ method, args }, response);
        return response;
      }
    } catch (error) {
      throw new ApolloError(error.message, 'SOAP_DATA_SOURCE', { error, method, args });
    }
  }
}
