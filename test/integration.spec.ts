import { InMemoryLRUCache } from 'apollo-server-caching';
import { ApolloError } from 'apollo-server-errors';
import { readFileSync } from 'fs';
import { createServer, Server } from 'http';
import { join } from 'path';
import * as soap from 'soap';
import { SOAPDataSource } from '../src';

const wsdlFile = join(__dirname, 'test.wsdl');

class TestSOAPDataSource extends SOAPDataSource {
  async greet(name: string) {
    return await this.callSoapMethod('sayHello', { firstName: name });
  }

  async greetFull(name: string) {
    return await this.callSoapServiceMethod('Hello_Service', 'Hello_Port', 'sayHello', { firstName: name });
  }

  async greetWithFaultV1_1() {
    return await this.callSoapMethod('sayHello', { firstName: 'error1_1' });
  }
}

let server: Server;

describe('Soap Data source', () => {
  beforeAll(done => {
    const helloService = {
      Hello_Service: {
        Hello_Port: {
          sayHello: args => {
            if (args.firstName === 'error1_1') {
              throw {
                Fault: {
                  faultcode: 'soap:Server',
                  faultstring: 'There was a fault',
                },
              };
            }
            return { greeting: `Hello ${args.firstName}` };
          },
        },
      },
    };
    const wsdl = readFileSync(wsdlFile, 'utf8');

    server = createServer((request, response) => {
      response.end('404: Not Found: ' + request.url);
    });

    soap.listen(server, '/wsdl', helloService, wsdl);
    server.listen(8000, done);
  });

  afterAll(done => server.close(done));

  it('Should return a method call', async () => {
    const dataSource = new TestSOAPDataSource(() => soap.createClientAsync(wsdlFile));
    dataSource.initialize({ cache: new InMemoryLRUCache(), context: {} });

    const response = await dataSource.greet('test name');
    expect(response).toEqual({ greeting: 'Hello test name' });
  });

  it('Should return a fully qualified method call', async () => {
    const dataSource = new TestSOAPDataSource(() => soap.createClientAsync(wsdlFile));
    dataSource.initialize({ cache: new InMemoryLRUCache(), context: {} });

    const response = await dataSource.greetFull('test name');
    expect(response).toEqual({ greeting: 'Hello test name' });
  });

  it('Should instantiate with client directly', async () => {
    const dataSource = new TestSOAPDataSource(await soap.createClientAsync(wsdlFile));
    dataSource.initialize({ cache: new InMemoryLRUCache(), context: {} });

    const response = await dataSource.greetFull('test name');
    expect(response).toEqual({ greeting: 'Hello test name' });
  });

  it('Should not return the SOAP response in the ApolloError', async () => {
    const dataSource = new TestSOAPDataSource(await soap.createClientAsync(wsdlFile));
    dataSource.initialize({ cache: new InMemoryLRUCache(), context: {} });

    try {
      await dataSource.greetWithFaultV1_1();
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toMatchObject(
        new ApolloError('soap:Server: There was a fault', 'SOAP_DATA_SOURCE', {
          error: new Error('soap:Server: There was a fault'),
          method: 'sayHello',
          args: { firstName: 'error1_1' },
        }),
      );
      expect(error.fault).toMatchObject({
        faultcode: 'soap:Server',
        faultstring: 'There was a fault',
      });
    }
  });
});
