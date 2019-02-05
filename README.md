# Apollo SOAPDataSource

[![CircleCI](https://circleci.com/gh/ovotech/apollo-datasource-soap.svg?style=svg)](https://circleci.com/gh/ovotech/apollo-datasource-soap)
[![npm (scoped)](https://img.shields.io/npm/v/@ovotech/apollo-datasource-soap.svg)](https://www.npmjs.com/package/@ovotech/apollo-datasource-soap)

SOAPDataSource is responsible for calling a soap client. Integrates with the cache, following the example of [Apollo Data Sources](https://www.apollographql.com/docs/apollo-server/features/data-sources.html).

### Using

```bash
yarn add @ovotech/apollo-datasource-soap
```

This module ships with TypeScript types.

```ts
import { SOAPDataSource } from '@ovotech/apollo-datasource-soap';
import { createClientAsync } from 'soap';

class MySOAPDataSource extends SOAPDataSource {
  async get() {
    return await this.callSoapMethod('myFunc', { someArg: 'val' });
  }

  async getFull() {
    return await this.callFullSoapMethod('myService', 'myPort', 'myFunc', { someArg: 'val' });
  }

  async rawClientCall() {
    const client = await this.getClient();
    return await client.myFuncAsync({ something: 'other' });
  }
}

const client = await createClientAsync('...some.wsdl'));
const ds = new MySOAPDataSource(client);
// or load client async
const ds = new MySOAPDataSource(() => createClientAsync('...some.wsdl')));
```

## Running the tests

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and tslint

```
yarn lint
```

## Deployment

To deploy a new version, push to master and then create a new release. CircleCI will automatically build and deploy a the version to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see `test/S3DataSource.spec.ts`). You can run the tests with `SERVICES=s3 localstack start` and `yarn test`.

## Responsible Team

- Boost Internal Tools (BIT)

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
