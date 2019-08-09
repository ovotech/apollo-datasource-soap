import { InMemoryLRUCache } from 'apollo-server-caching';
import { ApolloError } from 'apollo-server-errors';
import { SOAPDataSource } from '../src';

class TestSOAPDataSource extends SOAPDataSource {
  async greet(name: string) {
    return await this.callSoapMethod('sayHello', { firstName: name });
  }
  async greetFull(name: string) {
    return await this.callSoapServiceMethod('Hello_Service', 'Hello_Port', 'sayHello', { firstName: name });
  }
}

const client = {
  sayHello: jest.fn(),
  Hello_Service: { Hello_Port: { sayHello: jest.fn() } },
};

let dataSource: TestSOAPDataSource;

describe('SOAPDataSource', () => {
  const context = {};

  beforeEach(() => {
    dataSource = new TestSOAPDataSource(() => client as any);
    dataSource.initialize({
      cache: new InMemoryLRUCache(),
      context
    });
  });

  afterEach(() => {
    client.sayHello.mockClear();
    client.Hello_Service.Hello_Port.sayHello.mockClear();
  });

  it('Should get and cache data for shorthand', async () => {
    client.sayHello.mockImplementationOnce((args, cb) => cb(undefined, `you are ${args.firstName}`));

    await expect(dataSource.greet('tester')).resolves.toEqual('you are tester');
    await expect(dataSource.greet('tester')).resolves.toEqual('you are tester');

    expect(client.sayHello).toHaveBeenCalledTimes(1);
  });

  it('Should get and cache data for fully qualified', async () => {
    client.Hello_Service.Hello_Port.sayHello.mockImplementationOnce((args, cb) =>
      cb(undefined, `you are ${args.firstName}`),
    );

    await expect(dataSource.greetFull('tester')).resolves.toEqual('you are tester');
    await expect(dataSource.greetFull('tester')).resolves.toEqual('you are tester');

    expect(client.Hello_Service.Hello_Port.sayHello).toHaveBeenCalledTimes(1);
  });

  it('Should convert error to apollo error', async () => {
    client.sayHello.mockImplementationOnce((_, cb) => cb(new Error('problem')));

    await expect(dataSource.greet('tester')).rejects.toEqual(
      new ApolloError('problem', 'SOAP_DATA_SOURCE', {
        error: new Error('problem'),
        method: 'sayHello',
        args: { firstName: 'tester' },
      }),
    );

    expect(client.sayHello).toHaveBeenCalledTimes(1);
  });

  it('Keeps the DataSource Context', async () => {
    expect(Object.is(dataSource.context, context)).toBe(true);
  });
});
