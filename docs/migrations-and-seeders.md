# Migrations and Seeders Guide

This guide covers database migrations and seeders patterns and examples with `adonis-kysely`.

> **Note:** For CLI commands documentation, see the [Commands Guide](./commands.md).

## Table of Contents

- [Migrations](#migrations)
  - [Migration Structure](#migration-structure)
  - [Migration Examples](#migration-examples)
- [Seeders](#seeders)
  - [Seeder Structure](#seeder-structure)
  - [Seeder Organization](#seeder-organization)
  - [Advanced Seeding](#advanced-seeding)
  - [Seeder Examples](#seeder-examples)
- [Best Practices](#best-practices)

## Migrations

Migrations allow you to version control your database schema changes.

**Creating migrations:** See [Commands Guide - make:migration](./commands.md#makemigration)

### Migration Structure

Every migration file must export two functions: `up` and `down`.

```typescript
import type { Kysely } from 'kysely'

/**
 * Run the migration (apply changes)
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Create tables, add columns, etc.
}

/**
 * Rollback the migration (undo changes)
 */
export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables, remove columns, etc.
}
```

**Running migrations:** See [Commands Guide - migration:run](./commands.md#migrationrun)

### Migration Examples

#### Example 1: Create Table

```typescript
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('username', 'varchar', (col) => col.notNull().unique())
    .addColumn('email', 'varchar', (col) => col.notNull().unique())
    .addColumn('password', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute()
}
```

#### Example 2: Add Columns

```typescript
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('bio', 'text')
    .addColumn('avatar_url', 'varchar')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('bio')
    .dropColumn('avatar_url')
    .execute()
}
```

#### Example 3: Create Table with Foreign Key

```typescript
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('roles')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('permissions', 'jsonb', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('is_default', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('roles').execute()
}
```

#### Example 4: Create Index

```typescript
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createIndex('users_email_index')
    .on('users')
    .column('email')
    .execute()

  // Composite index
  await db.schema
    .createIndex('users_username_email_index')
    .on('users')
    .columns(['username', 'email'])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('users_email_index').execute()
  await db.schema.dropIndex('users_username_email_index').execute()
}
```

#### Example 5: Modify Column

```typescript
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Change column type
  await db.schema
    .alterTable('users')
    .alterColumn('bio', (col) => col.setDataType('varchar(500)'))
    .execute()

  // Make column nullable
  await db.schema
    .alterTable('users')
    .alterColumn('avatar_url', (col) => col.dropNotNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .alterColumn('bio', (col) => col.setDataType('text'))
    .execute()

  await db.schema
    .alterTable('users')
    .alterColumn('avatar_url', (col) => col.setNotNull())
    .execute()
}
```

## Seeders

Seeders populate your database with test or initial data.

**Creating seeders:** See [Commands Guide - make:seeder](./commands.md#makeseeder)

### Seeder Structure

Every seeder must export a default function that accepts the Kysely database instance:

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  // Insert data here
}
```

**Running seeders:** See [Commands Guide - seed:run](./commands.md#seedrun)

### Seeder Organization

Organize seeders into subfolders based on environment:

```
database/seeders/
├── main/           # Production/development seeders
│   ├── 01_roles_seeder.ts
│   └── 02_settings_seeder.ts
└── test/           # Test-only seeders
    ├── users_seeder.ts
    ├── posts_seeder.ts
    └── comments_seeder.ts
```

**Naming Convention:**
- Files must end with `_seeder.ts` or `_seeder.js`
- Prefix with numbers for execution order (optional)
- Use descriptive names: `users_seeder.ts`, not `seed1.ts`

### Advanced Seeding

#### Priority Order

Execute specific seeders first, in order:

```typescript
await testUtils.db().seed(
  'test',
  ['users_seeder', 'roles_seeder'], // Run these first, in this order
  [] // No exclusions
)
```

#### Exclude Patterns

Skip certain seeders:

```typescript
await testUtils.db().seed(
  'test',
  [], // No priority
  ['archived_', 'old_'] // Skip any seeder starting with these patterns
)
```

#### Combined Example

```typescript
await testUtils.db().seed(
  'test',
  ['users_seeder'], // Users first
  ['temp_', 'draft_'] // Skip temporary and draft seeders
)
```

### Seeder Examples

#### Example 1: Simple Insert

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  await db
    .insertInto('items')
    .values({
      id: '5c24bcce-f33e-4403-8fcd-affc2b5fc150',
      created_at: new Date(),
    })
    .execute()
}
```

#### Example 2: Multiple Inserts

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  await db
    .insertInto('users')
    .values([
      {
        id: crypto.randomUUID(),
        username: 'john',
        email: 'john@example.com',
        password: 'hashed_password',
        created_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        username: 'jane',
        email: 'jane@example.com',
        password: 'hashed_password',
        created_at: new Date(),
      },
    ])
    .execute()
}
```

#### Example 3: Insert with Error Handling

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  try {
    await db
      .insertInto('users')
      .values({
        id: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'hashed_password',
        created_at: new Date(),
      })
      .execute()
  } catch (error) {
    console.error('Error seeding users:', error)
    // Don't throw - allow other seeders to continue
  }
}
```

#### Example 4: Conditional Insert (Idempotent)

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  // Check if data already exists
  const existingUser = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', 'admin@example.com')
    .executeTakeFirst()

  if (!existingUser) {
    // Only insert if not already present
    await db
      .insertInto('users')
      .values({
        id: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'hashed_password',
        created_at: new Date(),
      })
      .execute()
  }
}
```

#### Example 5: Insert with Relations

```typescript
import type { DB } from 'adonis-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  // Create user
  const userId = crypto.randomUUID()
  await db
    .insertInto('users')
    .values({
      id: userId,
      username: 'john',
      email: 'john@example.com',
      password: 'hashed_password',
      created_at: new Date(),
    })
    .execute()

  // Create related roles
  await db
    .insertInto('roles')
    .values([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Admin',
        description: 'Administrator role',
        permissions: JSON.stringify({ read: true, write: true, delete: true }),
        is_active: true,
        is_default: false,
        created_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'User',
        description: 'Standard user role',
        permissions: JSON.stringify({ read: true, write: false, delete: false }),
        is_active: true,
        is_default: true,
        created_at: new Date(),
      },
    ])
    .execute()
}
```

## Database Type Generation

**Generating types:** See [Commands Guide - make:db-type](./commands.md#makedb-type)

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "paths": {
      "adonis-kysely/types/db": ["./types/db.ts"]
    }
  }
}
```

## Best Practices

### Migrations

#### 1. Always Provide Down Migrations

```typescript
// ✅ Good - reversible
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('users').addColumn('id', 'uuid').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute()
}

// ❌ Bad - can't rollback
export async function down(db: Kysely<any>): Promise<void> {
  // Empty - can't undo changes!
}
```

#### 2. One Change Per Migration

```typescript
// ✅ Good - focused migration
// File: create_users_table.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('users')
    // ... columns
    .execute()
}

// ❌ Bad - too many changes
// File: create_everything.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('users').execute()
  await db.schema.createTable('posts').execute()
  await db.schema.createTable('comments').execute()
  // Too much in one migration!
}
```

#### 3. Use Descriptive Names

```typescript
// ✅ Good names
create_users_table.ts
add_avatar_to_users.ts
create_posts_user_id_index.ts

// ❌ Bad names
migration1.ts
update.ts
changes.ts
```

#### 4. Handle Nullable Columns Carefully

```typescript
// When adding a new NOT NULL column to existing table
export async function up(db: Kysely<any>): Promise<void> {
  // Option 1: Add as nullable first
  await db.schema
    .alterTable('users')
    .addColumn('status', 'varchar')
    .execute()

  // Update existing rows
  await db.updateTable('users')
    .set({ status: 'active' })
    .execute()

  // Then make it NOT NULL
  await db.schema
    .alterTable('users')
    .alterColumn('status', (col) => col.setNotNull())
    .execute()
}
```

### Seeders

#### 1. Make Seeders Idempotent

```typescript
// ✅ Good - can run multiple times safely
export default async function seed(db: Kysely<DB>) {
  const exists = await db
    .selectFrom('users')
    .where('email', '=', 'admin@example.com')
    .executeTakeFirst()

  if (!exists) {
    await db.insertInto('users').values({...}).execute()
  }
}

// ❌ Bad - fails on second run
export default async function seed(db: Kysely<DB>) {
  await db.insertInto('users').values({...}).execute() // Error if exists!
}
```

#### 2. Use Error Handling

```typescript
// ✅ Good
export default async function seed(db: Kysely<DB>) {
  try {
    await db.insertInto('users').values({...}).execute()
  } catch (error) {
    console.error('Seeding failed:', error)
    // Don't throw - allow other seeders to run
  }
}
```

#### 3. Organize by Environment

```
database/seeders/
├── main/       # Production-safe data (roles, settings)
└── test/       # Test data only (sample users, posts)
```

#### 4. Use Meaningful Data

```typescript
// ✅ Good - realistic test data
export default async function seed(db: Kysely<DB>) {
  await db.insertInto('users').values({
    id: crypto.randomUUID(),
    username: 'john_doe',
    email: 'john@example.com',
    created_at: new Date(),
  }).execute()
}

// ❌ Bad - meaningless data
export default async function seed(db: Kysely<DB>) {
  await db.insertInto('users').values({
    id: crypto.randomUUID(),
    username: 'asdfasdf',
    email: 'x@x.x',
    created_at: new Date(),
  }).execute()
}
```

### General

#### 1. Keep Types in Sync

```bash
# After migrations
npm run build          # Or your build command
npx kysely-codegen --out-file=types/db.ts
```

#### 2. Version Control

- ✅ Commit migration files
- ✅ Commit seeder files
- ✅ Commit generated types (`types/db.ts`)
- ❌ Don't modify migration files after they're committed

#### 3. Test Migrations

Test your migrations work correctly:

```bash
# Run migrations
# Verify schema
# Run seeders
# Verify data
```
