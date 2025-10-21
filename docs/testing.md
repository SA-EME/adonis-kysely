# Testing Guide

This guide covers how to write tests for your AdonisJS application using `adonis-kysely` with automatic transaction management.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Migrations](#running-migrations)
- [Seeding Test Data](#seeding-test-data)
- [Transaction Management](#transaction-management)
- [Complete Test Examples](#complete-test-examples)
- [Best Practices](#best-practices)

## Overview

`adonis-kysely` provides automatic transaction wrapping in test mode to ensure:

- **Test Isolation**: Each test runs in its own transaction
- **No Data Persistence**: All changes are automatically rolled back after each test
- **Clean State**: Every test starts with a fresh database state
- **Fast Execution**: No need to truncate tables or reset sequences

## Test Setup

### 1. Configure Test Bootstrap

In your `tests/bootstrap.ts` file:

```typescript
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import kyselyTestUtils from 'adonis-kysely/services/test_utils'
import kyselyDB from 'adonis-kysely/services/main'

/**
 * Configure Japa plugins
 */
export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app)
]

/**
 * Global setup/teardown hooks
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      // Run migrations before all tests
      await kyselyTestUtils.migrate()

      // Optionally seed test data
      await kyselyTestUtils.db().seed('test')
    },
  ],
  teardown: [
    async () => {
      // Clean up database connection after all tests
      await kyselyDB.destroy()
    },
  ],
}

/**
 * Configure test suites
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

### 2. Import Test Utils

```typescript
import testUtils from 'adonis-kysely/services/test_utils'
```

The `testUtils` service provides:
- `migrate()` - Run database migrations
- `db().seed()` - Run seeders
- `startTransaction()` - Start test transaction
- `rollbackTransaction()` - Rollback test transaction

## Running Migrations

Migrations should run once before all tests in your global setup:

```typescript
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      await kyselyTestUtils.migrate()
    },
  ],
  teardown: [],
}
```

This executes all migration files in `database/migrations/` in order.

## Seeding Test Data

### Global Seeders

Run seeders once before all tests for baseline data:

```typescript
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      await kyselyTestUtils.migrate()

      // Seed test data from database/seeders/test/
      await kyselyTestUtils.db().seed('test')
    },
  ],
  teardown: [],
}
```

### Advanced Seeding Options

```typescript
// Seed specific subfolder
await kyselyTestUtils.db().seed('test')

// Seed with priority order
await kyselyTestUtils.db().seed(
  'test',
  ['users_seeder', 'roles_seeder'], // Run these first, in order
  ['archived_'] // Exclude seeders matching this pattern
)
```

See [Migrations and Seeders Guide](./migrations-and-seeders.md) for more details.

## Transaction Management

Each test should run in its own transaction to ensure isolation and automatic cleanup.

### Basic Transaction Setup

```typescript
import { test } from '@japa/runner'
import testUtils from 'adonis-kysely/services/test_utils'

test.group('User tests', (group) => {
  // Start transaction before each test
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  // Rollback transaction after each test
  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('create user', async ({ assert }) => {
    // Your test here - all changes will be rolled back
  })
})
```

### Why Transaction Wrapping?

Without transactions, tests would:
- Persist data to the database
- Cause conflicts between tests
- Require manual cleanup
- Run slower

With automatic rollback:
- ✅ Each test starts clean
- ✅ No data leaks between tests
- ✅ Faster execution
- ✅ No manual cleanup needed

## Complete Test Examples

### Example 1: Testing Repository Methods

```typescript
import { test } from '@japa/runner'
import testUtils from 'adonis-kysely/services/test_utils'
import kyselyDB from 'adonis-kysely/services/main'
import { UserRepository } from '#app/repositories/user_repository'

test.group('UserRepository', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('should create a new user', async ({ assert }) => {
    const userRepository = new UserRepository()

    const user = await userRepository.insert({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    })

    assert.exists(user.id)
    assert.equal(user.email, 'test@example.com')
    assert.equal(user.username, 'testuser')
  })

  test('should find all users', async ({ assert }) => {
    const userRepository = new UserRepository()

    // Create test users
    await userRepository.insert({
      email: 'user1@example.com',
      username: 'user1',
      password: 'password',
    })
    await userRepository.insert({
      email: 'user2@example.com',
      username: 'user2',
      password: 'password',
    })

    const users = await userRepository.all()
    assert.lengthOf(users, 2)
  })

  test('should update user', async ({ assert }) => {
    const userRepository = new UserRepository()

    const user = await userRepository.insert({
      email: 'original@example.com',
      username: 'original',
      password: 'password',
    })

    const updated = await userRepository.update(user.id, {
      email: 'updated@example.com',
    })

    assert.equal(updated.email, 'updated@example.com')
    assert.equal(updated.username, 'original') // Unchanged
  })

  test('should delete user', async ({ assert }) => {
    const userRepository = new UserRepository()

    const user = await userRepository.insert({
      email: 'delete@example.com',
      username: 'delete',
      password: 'password',
    })

    await userRepository.delete(user.id)

    const users = await userRepository.all()
    assert.lengthOf(users, 0)
  })
})
```

### Example 2: Testing Direct Queries

```typescript
import { test } from '@japa/runner'
import testUtils from 'adonis-kysely/services/test_utils'
import kyselyDB from 'adonis-kysely/services/main'

test.group('User queries', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('should create user', async ({ assert }) => {
    const user = await kyselyDB
      .getConnexion()
      .insertInto('users')
      .values({
        id: crypto.randomUUID(),
        email: 'test@example.com',
        username: 'test',
        password: 'password',
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    assert.exists(user.id)
    assert.equal(user.email, 'test@example.com')
  })

  test('should enforce unique constraint', async ({ assert }) => {
    // Insert first user
    await kyselyDB
      .getConnexion()
      .insertInto('users')
      .values({
        id: crypto.randomUUID(),
        email: 'test@example.com',
        username: 'test',
        password: 'password',
        created_at: new Date(),
      })
      .execute()

    // Try to insert duplicate email
    try {
      await kyselyDB
        .getConnexion()
        .insertInto('users')
        .values({
          id: crypto.randomUUID(),
          email: 'test@example.com', // Duplicate email
          username: 'test2',
          password: 'password',
          created_at: new Date(),
        })
        .execute()

      assert.fail('Expected constraint violation')
    } catch (error: any) {
      assert.instanceOf(error, Error)
      assert.include(
        error.message,
        'duplicate key value violates unique constraint'
      )
    }
  })
})
```

### Example 3: Testing HTTP Endpoints

```typescript
import { test } from '@japa/runner'
import testUtils from 'adonis-kysely/services/test_utils'

test.group('POST /users', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('should create user via API', async ({ client, assert }) => {
    const response = await client.post('/users').json({
      email: 'api@example.com',
      username: 'apiuser',
      password: 'password123',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      user: {
        email: 'api@example.com',
        username: 'apiuser',
      },
    })
  })

  test('should validate required fields', async ({ client }) => {
    const response = await client.post('/users').json({
      email: 'invalid',
      // Missing username and password
    })

    response.assertStatus(422)
  })
})
```

### Example 4: Testing with Fixtures

Create test fixtures for reusable test data:

```typescript
// tests/fixtures/users.stub.ts
export const userFixtures = {
  john: {
    email: 'john@example.com',
    username: 'john',
    password: 'password123',
  },
  jane: {
    email: 'jane@example.com',
    username: 'jane',
    password: 'password456',
  },
}
```

Use in tests:

```typescript
import { test } from '@japa/runner'
import testUtils from 'adonis-kysely/services/test_utils'
import { UserRepository } from '#app/repositories/user_repository'
import { userFixtures } from '#tests/fixtures/users.stub'

test.group('Users with fixtures', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('should create multiple users', async ({ assert }) => {
    const userRepository = new UserRepository()

    const john = await userRepository.insert(userFixtures.john)
    const jane = await userRepository.insert(userFixtures.jane)

    const users = await userRepository.all()
    assert.lengthOf(users, 2)
  })
})
```

## Best Practices

### 1. Always Use Transaction Wrapping

```typescript
// ✅ Correct - with transactions
test.group('Users', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('create user', async () => {
    // Test here
  })
})

// ❌ Wrong - without transactions
test.group('Users', () => {
  test('create user', async () => {
    // Data will persist!
  })
})
```

### 2. Use Descriptive Test Names

```typescript
// ✅ Good
test('should create user with valid data', async () => {})
test('should reject user with duplicate email', async () => {})
test('should update user password', async () => {})

// ❌ Bad
test('test1', async () => {})
test('user', async () => {})
```

### 3. Separate Setup from Test Logic

```typescript
// ✅ Good
test.group('User deletion', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  test('should delete user', async ({ assert }) => {
    const userRepository = new UserRepository()

    const user = await userRepository.insert({
      email: 'test@example.com',
      username: 'test',
      password: 'password',
    })

    await userRepository.delete(user.id)

    const users = await userRepository.all()
    assert.lengthOf(users, 0)
  })
})
```

### 4. Test Both Success and Failure Cases

```typescript
test.group('User creation', (group) => {
  group.each.setup(async () => {
    await testUtils.startTransaction()
  })

  group.each.teardown(async () => {
    await testUtils.rollbackTransaction()
  })

  // Success case
  test('should create user with valid data', async ({ assert }) => {
    // Test successful creation
  })

  // Failure cases
  test('should reject duplicate email', async ({ assert }) => {
    // Test constraint violation
  })

  test('should reject invalid email format', async ({ assert }) => {
    // Test validation
  })
})
```

### 5. Use Type-Safe Assertions

```typescript
test('should create user', async ({ assert }) => {
  const user = await userRepository.insert({
    email: 'test@example.com',
    username: 'test',
    password: 'password',
  })

  // ✅ Type-safe assertions
  assert.exists(user.id)
  assert.equal(user.email, 'test@example.com')
  assert.instanceOf(user.created_at, Date)

  // ✅ Property checks
  assert.properties(user, ['id', 'email', 'username', 'created_at'])
})
```

### 6. Clean Test Data

```typescript
// ✅ Good - clean, minimal test data
const user = await userRepository.insert({
  email: 'test@example.com',
  username: 'test',
  password: 'password',
})

// ❌ Bad - unnecessary complex data
const user = await userRepository.insert({
  email: 'super.complex.email.address.for.testing@example.com',
  username: 'super_complex_username_123_test',
  password: 'SuperComplexP@ssw0rd!123',
})
```

## Troubleshooting

### Tests Are Persisting Data

If test data is persisting between tests:

1. Ensure you're calling `startTransaction()` in setup
2. Ensure you're calling `rollbackTransaction()` in teardown
3. Check that you're using `kyselyDB.getConnexion()` in all queries

### Transactions Not Rolling Back

```typescript
// ✅ Correct - transaction wrapping
group.each.setup(async () => {
  await testUtils.startTransaction()
})

group.each.teardown(async () => {
  await testUtils.rollbackTransaction() // Must call this!
})

// ❌ Wrong - missing teardown
group.each.setup(async () => {
  await testUtils.startTransaction()
})
// No teardown = transaction never rolls back
```

### Migration Errors

If migrations fail to run:

1. Check your database connection in `.env`
2. Verify migration files are valid
3. Check for syntax errors in migration files
4. Ensure database exists before running tests

```bash
# Create test database if needed
createdb your_test_database
```
