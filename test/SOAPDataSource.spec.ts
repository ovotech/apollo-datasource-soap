import { InMemoryLRUCache } from 'apollo-server-caching';
import { ApolloError } from 'apollo-server-errors';
import { SOAPDataSource } from '../src';
import { Client } from 'soap';

const willSendRequestSpy = jest.fn().mockResolvedValue('So resolved!');

class TestSOAPDataSource extends SOAPDataSource {
  async greet(name: string) {
    return await this.callSoapMethod('sayHello', { firstName: name });
  }
  async greetFull(name: string) {
    return await this.callSoapServiceMethod('Hello_Service', 'Hello_Port', 'sayHello', { firstName: name });
  }
  async willSendRequest(client: Client) {
    return await willSendRequestSpy();
  }
}

const client = {
  sayHello: jest.fn(),
  Hello_Service: { Hello_Port: { sayHello: jest.fn() } },
};

let dataSource: TestSOAPDataSource;

describe('S3Cache', () => {
  beforeEach(() => {
    dataSource = new TestSOAPDataSource(() => client as any);
    dataSource.initialize({
      cache: new InMemoryLRUCache(),
      context: {},
    });
  });

  afterEach(() => {
    willSendRequestSpy.mockClear();
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

  it('Should call willSendRequest before every shorthand request', async () => {
    client.sayHello.mockImplementationOnce((args, cb) => cb(undefined, `you are ${args.firstName}`));

    await dataSource.greet('tester');

    expect(willSendRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('Should call willSendRequest before every fully qualified request', async () => {
    client.Hello_Service.Hello_Port.sayHello.mockImplementationOnce((args, cb) =>
      cb(undefined, `you are ${args.firstName}`),
    );

    await dataSource.greetFull('tester');

    expect(willSendRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('Should convert error to apollo error', async () => {
    const soapError = {
      message: 'problem',
      root: {
        Envelope: {
          Body: {
            Fault: {
              faultcode: 'soap:Server',
              faultstring: 'Something went wrong',
            },
          },
        },
      },
    };

    client.sayHello.mockImplementationOnce((_, cb) => cb(soapError));

    await expect(dataSource.greet('tester')).rejects.toEqual(
      new ApolloError('problem', 'SOAP_DATA_SOURCE', {
        fault: {
          faultcode: 'soap:Server',
          faultstring: 'Something went wrong',
        },
        method: 'sayHello',
        args: { firstName: 'tester' },
      }),
    );

    expect(client.sayHello).toHaveBeenCalledTimes(1);
  });
});
