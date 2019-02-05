import { InMemoryLRUCache } from 'apollo-server-caching';
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
}

let server: Server;

describe('Soap Data source', () => {
  beforeAll(done => {
    const helloService = {
      Hello_Service: {
        Hello_Port: {
          sayHello: args => ({ greeting: `Hello ${args.firstName}` }),
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
});
