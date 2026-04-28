# Execution Context Guide

This guide covers `dbContext` and `executionContext` - the foundation for request-scoped data and transaction management.

## Quick Start

```typescript
import { dbContext } from 'adonisjs-kysely/services/main'
import executionContext from 'adonisjs-kysely/services/execution_context'

// 1. Wrap your entry point
await dbContext.run(async () => {
  // 2. Store request-scoped data
  executionContext.set('userId', { value: user.id, injectToDb: true })

  // 3. All code inside can access the context
  const userId = executionContext.get<string>('userId')
})
```

## dbContext.run()

The single entry point for establishing execution scope.

### Basic Usage

```typescript
await dbContext.run(async () => {
  // All DB operations here share the same context
})
```

### With Initial Context

```typescript
await dbContext.run(
  {
    executionContext: {
      userId: { value: user.id, injectToDb: true },
      tenantId: { value: tenant.id, injectToDb: true },
    },
  },
  async () => {
    // userId and tenantId are immediately available
  }
)
```

### Idempotent Behavior

Nested `run()` calls reuse the existing context (safe composition):

```typescript
await dbContext.run(async () => {
  executionContext.set('outer', { value: 1, injectToDb: false })

  await dbContext.run(async () => {
    // Same context - can access 'outer'
    const val = executionContext.get('outer') // Returns 1
  })
})
```

### Force New Context

Use `forceNew: true` when you need isolated context (e.g., background jobs):

```typescript
await dbContext.run(async () => {
  // Main request context

  setImmediate(() => {
    // Fire-and-forget with isolated context
    dbContext.run({ forceNew: true }, async () => {
      // Cannot see outer context or transactions
    })
  })
})
```

## executionContext

Store and retrieve request-scoped data.

### Storing Data

```typescript
executionContext.set('userId', {
  value: user.id,
  injectToDb: true, // Makes available in PostgreSQL
})

executionContext.set('requestId', {
  value: crypto.randomUUID(),
  injectToDb: false, // App-only, not in DB
})
```

### Retrieving Data

```typescript
const userId = executionContext.get<string>('userId')
const all = executionContext.getAll()
```

### PostgreSQL Integration

Values with `injectToDb: true` are available via `current_setting()`:

```sql
-- In RLS policies
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenantId')::uuid);

-- In audit triggers
INSERT INTO audit_log (actor_id)
VALUES (current_setting('app.userId')::uuid);
```

## Usage Patterns

### HTTP Middleware

```typescript
server.use([
  async (ctx, next) => {
    await dbContext.run(
      {
        executionContext: {
          userId: { value: ctx.auth.user?.id, injectToDb: true },
          tenantId: { value: ctx.tenant?.id, injectToDb: true },
        },
      },
      async () => {
        await next()
      }
    )
  },
])
```

### CLI Commands

```typescript
export default class SyncUsers extends BaseCommand {
  async run() {
    await dbContext.run(async () => {
      executionContext.set('source', { value: 'cli', injectToDb: false })
      await this.syncService.run()
    })
  }
}
```

### Background Jobs

```typescript
class JobProcessor {
  async handle(job: Job) {
    await dbContext.runExclusive(async () => {
      executionContext.set('jobId', { value: job.id, injectToDb: true })
      await this.handlers[job.type](job.payload)
    })
  }
}
```

### Services (Defensive Pattern)

Services can wrap in `run()` for standalone usage while safely composing when called from HTTP:

```typescript
class OrderService {
  async createOrder(data: OrderData) {
    return dbContext.run(async () => {
      // If called from HTTP: reuses existing context
      // If called standalone: creates own context
      return this.orderRepo.create(data)
    })
  }
}
```

## API Reference

### dbContext

| Method                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `run(callback)`          | Execute in context (idempotent)                           |
| `run(options, callback)` | Execute with initial context                              |
| `runExclusive(callback)` | Execute only if not already in context (throws otherwise) |
| `isActive()`             | Check if inside a context                                 |

### executionContext

| Method            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `set(key, value)` | Store data (throws if outside context)          |
| `get<T>(key)`     | Get data (returns undefined if outside context) |
| `getAll()`        | Get all stored data                             |

### Value Structure

```typescript
interface ExecutionContextValue {
  value: unknown // The actual value
  injectToDb: boolean // If true, available via current_setting('app.key')
}
```
