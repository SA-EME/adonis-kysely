<h1 align="center">Adonis kysely package</h1>

`adonis-kysely` package is a package for easy configuration of [kysely](https://github.com/kysely-org/kysely) on [adonisjs](https://github.com/adonisjs).

## WIP: This project is currently under development, with no version available at the moment.

- If you want to try out the package, the only way is to compile it from this repository, see [build section](https://github.com/SA-EME/adonis-kysely).
- ⚠ Please note that this package is under development and may contain bugs. If you encounter any, do not hesitate to open an issue.
- ⚠ It only works with PostgreSQL at this moment.

## Prerequire
- Need to have configured [database system](https://docs.adonisjs.com/guides/database/introduction)


## Usage

### 1. Configure package

```
node ace configure adonis-kysely
```

For the moment, you need to add this configuration to the tsconfig.json file, in order to obtain the type from the database.

```json
{
  "compilerOptions": {
    "paths": {
      "adonis-kysely/types/db": ["./types/db.ts"]
    }
  }
}
```

You need to generate the type from your database

- Modify `DATABASE_URL` in .env file

And run the command to generate the type

```sh
npx kysely-codegen --out-file=types/db.ts
```

### 2. Using package

- [Kysely db](#basic-request)
- [Transaction](#transaction)
- [Controlled transaction](#controlled-transaction)
- [Integrate in test](#integrate-in-test)


#### Kysely db object
`getConnexion` permit to access to kysely db object

```javascript
import kyselyDB from 'adonis-kysely/services/main'

const user = await kyselyDB.getConnexion().selectFrom('users').selectAll().execute()
```

#### Transaction
With `runInTransaction` you will not able to rollback the transaction manually.
This function commit if any error & rollback in case of error

```javascript
import kyselyDB from 'adonis-kysely/services/main'

await kyselyDB.runInTransaction(async () => {
  await this.userRepository.create({
    displayName: 'test',
    email: 'test@example.com',
    password: '',
  })

  const users = await this.userRepository.all()
})
```

#### Controlled transaction
`startTransaction` permit to start a transaction, after you can use `getContext().run(uuidTransaction, callback)` to execute what you want inside the transaction

⚠ *only one instance of startTransaction can be started, otherwise it generates an error*


```javascript
import kyselyDB from 'adonis-kysely/services/main'

const transaction = await kyselyDB.startTransaction()

if (!transaction) return

await kyselyDB.getContext().run(transaction, async () => {
  await this.userRepository.create({
    displayName: 'test',
    email: 'test@example.com'),
    password: '',
  })

  const users = await this.userRepository.all()
})

await sleep(3000)
await kyselyDB.getContext().run(transaction, async () => {
  await kyselyDB.rollbackTransaction(transaction)
})

```

#### Integrate in test
During the test, you will never add sql to the database, all the database function will use test transaction.

```javascript
// bootstrap.ts
```

```javascript
import { test } from '@japa/runner'

import kyselyDB from 'adonis-kysely/services/main'

import { UserRepository } from '#user/repositories/user_repository'
import { CompanyRepository } from '#companies/repositories/company_repository'

test.group('test with transaction', (group) => {
  // or configure direct in test group
  group.each.setup(async () => {
    await kyselyDB.startTransaction()
  })

  group.each.teardown(async () => {
    await kyselyDB.rollbackTransaction()
  })

  test('create user', async ({ assert }) => {
    const userRepository = new UserRepository()
    await userRepository.create({
      displayName: 'test',
      email: 'test@example.com'
      password: '',
    })
    const users = await userRepository.all()
    assert.lengthOf(users, 1)
  })
})

```

## Build

### 1. Clone the repository

```sh
git clone https://github.com/SA-EME/adonis-kysely
cd adonis-kysely
```

### 2. Build the project

```sh
npm install
npm run build
npm pack
```

It generates a file like this _adonis-kysely-x.x.x.tgz_

### 3. Install the package under your project

```sh
npm install adonis-kysely-x.x.x.tgz
```