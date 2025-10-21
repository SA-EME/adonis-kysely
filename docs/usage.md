# Usage Guide

This guide covers how to use `adonis-kysely` in your AdonisJS application to perform database operations with Kysely.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Repository Pattern](#repository-pattern)
- [Basic Database Operations](#basic-database-operations)
- [Transaction Management](#transaction-management)
  - [Automatic Transactions](#automatic-transactions-runintransaction)
  - [Manual Nested Transactions](#manual-nested-transactions-starttransaction)
- [Best Practices](#best-practices)

## Installation

```bash
node ace configure adonis-kysely
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
      "adonis-kysely/types/db": ["./types/db.ts"]
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
import { defineConfig } from 'adonis-kysely'
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

## Repository Pattern

The recommended approach is to use the **repository pattern** for database operations. All queries must go through `getConnexion()` to enable proper transaction management.

### Example Repository

```typescript
import kyselyDB from 'adonis-kysely/services/main'

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
import kyselyDB from 'adonis-kysely/services/main'

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

`adonis-kysely` provides two transaction modes depending on your needs:

### Automatic Transactions: `runInTransaction()`

Use this for **simple, single-level transactions** where you want automatic commit/rollback handling.

**Key characteristics:**
- ✅ Automatically commits on success
- ✅ Automatically rolls back on error
- ✅ Simple and clean API
- ❌ Cannot manually control commit/rollback
- ❌ Creates only ONE transaction context (no nesting)

**Example:**

```typescript
import kyselyDB from 'adonis-kysely/services/main'

export default class UserCreateController {
  async execute({ request, response }: HttpContext) {
    const payload = await request.validateUsing(validator)

    await kyselyDB.runInTransaction(async () => {
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

      return response.status(201).send({ user })
    })
  }
}
```

### Manual Nested Transactions: `startTransaction()`

Use this when you need **fine-grained control** over transactions or **nested transactions** (savepoints).

**Key characteristics:**
- ✅ Full manual control over commit/rollback
- ✅ Supports nested transactions via savepoints
- ✅ Multiple transaction levels
- ⚠️ You must manually commit or rollback
- ⚠️ More verbose

**Example: Simple Manual Transaction**

```typescript
import kyselyDB from 'adonis-kysely/services/main'

export default class UsersController {
  async create({ request, response }: HttpContext) {
    const transactionId = await kyselyDB.startTransaction()

    try {
      const user = await this.userRepository.insert({
        email: request.input('email'),
        username: request.input('username'),
        password: request.input('password'),
      })

      // Manually commit when ready
      await kyselyDB.commitTransaction(transactionId)

      return response.status(201).json(user)
    } catch (error) {
      // Manually rollback on error
      await kyselyDB.rollbackTransaction(transactionId)
      throw error
    }
  }
}
```

**Example: Nested Transactions (Savepoints)**

```typescript
import kyselyDB from 'adonis-kysely/services/main'

export default class ComplexController {
  async execute({ request, response }: HttpContext) {
    // Start root transaction
    const rootTxId = await kyselyDB.startTransaction()

    try {
      // This uses the root transaction
      const user = await this.userRepository.insert({
        email: 'user@example.com',
        username: 'john',
        password: 'secret',
      })

      // Start nested transaction (savepoint)
      const nestedTxId = await kyselyDB.startTransaction()

      try {
        // This uses the nested transaction
        await this.roleRepository.insert({
          user_id: user.id,
          name: 'Admin',
          permissions: JSON.stringify({ read: true, write: true }),
        })

        // Commit nested transaction
        await kyselyDB.commitTransaction(nestedTxId)
      } catch (error) {
        // Rollback only the nested transaction (role creation)
        // User creation is still pending in root transaction
        await kyselyDB.rollbackTransaction(nestedTxId)
        console.log('Role creation failed, but user creation continues')
      }

      // Commit root transaction
      await kyselyDB.commitTransaction(rootTxId)

      return response.status(201).json({ user })
    } catch (error) {
      // Rollback everything
      await kyselyDB.rollbackTransaction(rootTxId)
      return response.status(500).json({ error: 'Failed to create user' })
    }
  }
}
```

### Transaction ID Resolution

Both `commitTransaction()` and `rollbackTransaction()` can automatically resolve the transaction ID:

```typescript
// Explicit ID (recommended for nested transactions)
const txId = await kyselyDB.startTransaction()
await kyselyDB.commitTransaction(txId)

// Auto-resolve (uses most recent transaction)
await kyselyDB.startTransaction()
await kyselyDB.commitTransaction() // No ID needed
```

## Best Practices

### 1. Always Use `getConnexion()`

All database queries must go through `getConnexion()` to ensure transaction awareness:

```typescript
// ✅ Correct
kyselyDB.getConnexion().selectFrom('users').selectAll().execute()

// ❌ Wrong - bypasses transaction system
// Don't create a separate Kysely instance
```

### 2. Choose the Right Transaction Mode

| Scenario | Use |
|----------|-----|
| Simple operations with auto-commit/rollback | `runInTransaction()` |
| Need manual control over commit timing | `startTransaction()` |
| Nested transactions (savepoints) | `startTransaction()` |
| Complex multi-step workflows with partial rollbacks | `startTransaction()` |

### 3. Repository Pattern

Encapsulate database logic in repositories for better organization and testability:

```typescript
// ✅ Good
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

// ✅ Use in controller
const user = await userRepository.findByEmail('test@example.com')
```

### 4. Error Handling

Always handle errors appropriately in transactions:

```typescript
// With runInTransaction - automatic rollback
await kyselyDB.runInTransaction(async () => {
  // Operations here
  // Errors automatically trigger rollback
})

// With startTransaction - manual rollback
const txId = await kyselyDB.startTransaction()
try {
  // Operations here
  await kyselyDB.commitTransaction(txId)
} catch (error) {
  await kyselyDB.rollbackTransaction(txId)
  throw error
}
```

### 5. Type Safety

Keep your database types up to date:

```bash
# Regenerate types after schema changes
npx kysely-codegen --out-file=types/db.ts
```

## Advanced: Transaction Context

For advanced use cases, you can access the transaction context:

```typescript
import kyselyDB from 'adonis-kysely/services/main'

// Get current transaction context
const context = kyselyDB.getContext()

// List active transactions
const activeTransactions = kyselyDB.listTransaction()

// Get specific transaction
const txId = await kyselyDB.startTransaction()
const transaction = kyselyDB.getTransaction(txId)
```
