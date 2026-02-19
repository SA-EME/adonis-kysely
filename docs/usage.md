# Usage Guide

This guide covers how to use `adonisjs-kysely` in your AdonisJS application to perform database operations with Kysely.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Execution Context](#execution-context)
- [Repository Pattern](#repository-pattern)
- [Basic Database Operations](#basic-database-operations)
- [Transaction Management](#transaction-management)
- [Request-Scoped Data](#request-scoped-data)
- [Best Practices](#best-practices)

## Installation

```bash
node ace configure adonisjs-kysely
```

This command will:
- Create `config/kysely.ts` configuration file
- Create `types/db.ts` stub for database types
- Add `DATABASE_URL` to your environment variables
- Register the provider and commands in `.adonisrc.ts`

### Generate Database Types

Add the following to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "adonisjs-kysely/types/db": ["./types/db.ts"]
    }
  }
}
```

Then generate TypeScript types from your database schema:

```bash
npx kysely-codegen --out-file=types/db.ts
```

## Configuration

Configure your database connection in `config/kysely.ts`:

```typescript
import pg from 'pg'
import env from '#start/env'
import { defineConfig } from 'adonisjs-kysely'
import { PostgresDialect } from 'kysely'

const { Pool } = pg

const pool = new Pool({
  host: env.get('DB_HOST'),
  user: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
  database: env.get('DB_DATABASE'),
  max: 20,
})

const dialect = new PostgresDialect({ pool })

export default defineConfig({
  dialect,
  log: ['query', 'error'], // Optional: log queries
})
```

## Execution Context

All database operations should run inside a `dbContext.run()` scope. This establishes the execution context that enables:
- Transaction management
- Request-scoped data (user ID, tenant ID, etc.)
- PostgreSQL RLS via `set_config()`

### HTTP Middleware Setup

Wrap your HTTP requests in `dbContext.run()`:

```typescript
// start/kernel.ts or middleware
import { dbContext } from 'adonisjs-kysely/services/main'
import executionContext from 'adonisjs-kysely/services/execution_context'

server.use([
  async (ctx, next) => {
    await dbContext.run({
      executionContext: {
        userId: { value: ctx.auth.user?.id, injectToDb: true },
        requestId: { value: ctx.request.id(), injectToDb: false },
      }
    }, async () => {
      await next()
    })
  }
])
```

### CLI Commands

Wrap command logic in `dbContext.run()`:

```typescript
export default class ProcessOrders extends BaseCommand {
  async run() {
    await dbContext.run(async () => {
      // Command logic here
    })
  }
}
```

## Repository Pattern

The recommended approach is to use the **repository pattern** for database operations. All queries must go through `getConnexion()` to ensure transaction awareness.

### Example Repository

```typescript
import kyselyDB from 'adonisjs-kysely/services/main'

export class UserRepository {
  all() {
    return kyselyDB.getConnexion().selectFrom('users').selectAll().execute()
  }

  async insert(user: { email: string; username: string; password: string }) {
    return kyselyDB
      .getConnexion()
      .insertInto('users')
      .values({
        id: crypto.randomUUID().toString(),
        ...user,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async update(id: string, user: { email?: string; username?: string }) {
    return kyselyDB
      .getConnexion()
      .updateTable('users')
      .set(user)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async delete(id: string) {
    return kyselyDB
      .getConnexion()
      .deleteFrom('users')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}
```

## Basic Database Operations

### Direct Queries

For simple one-off queries without a repository:

```typescript
import kyselyDB from 'adonisjs-kysely/services/main'

const users = await kyselyDB.getConnexion().selectFrom('users').selectAll().execute()
```

### Using Repositories in Controllers

```typescript
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { UserRepository } from '#app/repositories/user_repository'

@inject()
export default class UsersController {
  constructor(private userRepository: UserRepository) {}

  async index({ response }: HttpContext) {
    const users = await this.userRepository.all()
    return response.json(users)
  }

  async store({ request, response }: HttpContext) {
    const data = request.only(['email', 'username', 'password'])
    const user = await this.userRepository.insert(data)
    return response.status(201).json(user)
  }
}
```

## Transaction Management

Use `kyselyDB.runInTransaction()` when you need atomicity:

```typescript
import kyselyDB from 'adonisjs-kysely/services/main'

export default class UserCreateController {
  async execute({ request, response }: HttpContext) {
    const payload = await request.validateUsing(validator)

    const user = await kyselyDB.runInTransaction(async () => {
      // Create user
      const user = await this.userRepository.insert({
        email: payload.email,
        username: payload.username,
        password: payload.password,
      })

      // Create default role
      await this.roleRepository.insert({
        user_id: user.id,
        name: 'User',
        is_default: true,
      })

      // If any operation fails, everything is automatically rolled back
      // If all succeed, everything is automatically committed

      return user
    })

    return response.status(201).send({ user })
  }
}
```

**Key characteristics:**
- Automatically commits on success
- Automatically rolls back on error
- Supports nesting (inner transactions become savepoints)
- Works with `getConnexion()` - all queries inside use the transaction

### Nested Transactions

Nested `runInTransaction()` calls create savepoints:

```typescript
await kyselyDB.runInTransaction(async () => {
  const user = await this.userRepository.insert({ ... })

  try {
    await kyselyDB.runInTransaction(async () => {
      // This creates a savepoint
      await this.roleRepository.insert({ user_id: user.id, ... })
      throw new Error('Oops')
    })
  } catch {
    // Savepoint rolled back, but user insert is still pending
  }

  // User will be committed
})
```

## Request-Scoped Data

Store request-scoped data using `executionContext`:

```typescript
import executionContext from 'adonisjs-kysely/services/execution_context'

// In middleware - store data
executionContext.set('userId', { value: user.id, injectToDb: true })
executionContext.set('requestId', { value: requestId, injectToDb: false })

// In services/repositories - retrieve data
const userId = executionContext.get<string>('userId')
```

**`injectToDb: true`** makes the value available in PostgreSQL via `current_setting('app.userId')` - useful for RLS policies and audit triggers

## Best Practices

### 1. Always Use `getConnexion()`

All database queries must go through `getConnexion()` to ensure transaction awareness:

```typescript
// ✅ Correct - call fresh each time
kyselyDB.getConnexion().selectFrom('users').selectAll().execute()

// ❌ Wrong - caching the connection
class UserRepo {
  private db = kyselyDB.getConnexion() // Don't cache!
}
```

### 2. Wrap Entry Points in `dbContext.run()`

HTTP requests, CLI commands, and background jobs should establish context:

```typescript
// ✅ HTTP middleware
await dbContext.run(async () => {
  await next()
})

// ✅ CLI command
await dbContext.run(async () => {
  // Command logic
})

// ✅ Background job
await dbContext.run(async () => {
  // Job logic
})
```

### 3. Use `runInTransaction()` for Atomicity

```typescript
// ✅ When operations must succeed or fail together
await kyselyDB.runInTransaction(async () => {
  await createUser()
  await createDefaultRole()
  await sendWelcomeEmail()
})
```

### 4. Repository Pattern

Encapsulate database logic in repositories:

```typescript
export class UserRepository {
  async findByEmail(email: string) {
    return kyselyDB
      .getConnexion()
      .selectFrom('users')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst()
  }
}
```

### 5. Keep Types Updated

```bash
# Regenerate types after schema changes
npx kysely-codegen --out-file=types/db.ts
```

## API Reference

### `kyselyDB` (from `services/main`)

| Method | Description |
|--------|-------------|
| `getConnexion()` | Get Kysely instance or current transaction |
| `runInTransaction(callback)` | Execute callback in a transaction |
| `destroy()` | Close database connection |

### `dbContext` (from `services/main`)

| Method | Description |
|--------|-------------|
| `run(callback)` | Establish execution scope |
| `run(options, callback)` | Establish scope with initial context |
| `isActive()` | Check if inside a scope |

### `executionContext` (from `services/execution_context`)

| Method | Description |
|--------|-------------|
| `set(key, value)` | Store request-scoped data |
| `get<T>(key)` | Retrieve scoped data |
| `getAll()` | Get all context as object |
