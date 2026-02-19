# Commands Guide

This guide covers all CLI commands provided by `adonisjs-kysely`.

## Table of Contents

- [Available Commands](#available-commands)
- [Migration Commands](#migration-commands)
- [Seeder Commands](#seeder-commands)
- [Utility Commands](#utility-commands)
- [Common Workflows](#common-workflows)

## Available Commands

### Migration Commands

| Command | Description |
|---------|-------------|
| `node ace make:migration <name>` | Create a new migration file |
| `node ace migration:run` | Execute all pending migrations |
| `node ace migration:rollback` | Rollback migrations |

### Seeder Commands

| Command | Description |
|---------|-------------|
| `node ace make:seeder <name>` | Create a new seeder file |
| `node ace seed:run` | Run all seeders |
| `node ace seed:purge [tableName]` | Delete all data from tables |

### Utility Commands

| Command | Description |
|---------|-------------|
| `node ace make:db-type` | Generate TypeScript types from database schema |

## Migration Commands

### make:migration

Creates a new migration file in `database/migrations/`.

**Syntax:**
```bash
node ace make:migration <name>
```

**Example:**
```bash
node ace make:migration users
```

**Generated File:**
```
database/migrations/1755697497022_create_users_table.ts
```

**Template:**
```typescript
import type { DB } from 'adonisjs-kysely/types/db'
import type { Kysely } from 'kysely'

const tableName = 'users'

export async function up(db: Kysely<DB>) {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz')
    .execute()
}

export async function down(db: Kysely<DB>) {
  await db.schema.dropTable(tableName).execute()
}
```

**Naming:**
- Converts to plural: `user` → `users`
- Converts to snake_case: `userProfile` → `user_profiles`
- Adds timestamp prefix

### migration:run

Executes all pending migrations in chronological order.

**Syntax:**
```bash
node ace migration:run
```

**Output:**
```
✅ migration "1755697497022_create_users_table" was executed successfully
✅ migration "1755698174800_create_roles_table" was executed successfully
```

**What it does:**
1. Scans `database/migrations/` for migration files
2. Checks which migrations have been executed
3. Runs pending migrations in order (oldest first)
4. Records executed migrations in the database

### migration:rollback

Rolls back previously executed migrations.

**Syntax:**
```bash
node ace migration:rollback [options]
```

**Options:**
- `--step=<number>` or `-s=<number>` - Number of migrations to rollback (default: 1)

**Examples:**

Rollback last migration:
```bash
node ace migration:rollback
```

Rollback last 3 migrations:
```bash
node ace migration:rollback --step=3
```

**Output:**
```
✅ migration "1759990056999_create_items_table" rolled back successfully
```

## Seeder Commands

### make:seeder

Creates a new seeder file in `database/seeders/`.

**Syntax:**
```bash
node ace make:seeder <name>
```

**Example:**
```bash
node ace make:seeder users
```

**Generated File:**
```
database/seeders/users_seeder.ts
```

**Template:**
```typescript
import type { DB } from 'adonisjs-kysely/types/db'
import type { Kysely } from 'kysely'

export default async function seed(db: Kysely<DB>) {
  // Add your seeding logic here
  await db
    .insertInto('users')
    .values({
      id: crypto.randomUUID(),
      created_at: new Date(),
    })
    .execute()
}
```

**Naming:**
- Converts to snake_case: `userProfile` → `user_profile_seeder.ts`
- Adds `_seeder.ts` suffix

### seed:run

Executes all seeder files in the `database/seeders/` directory (including subdirectories).

**Syntax:**
```bash
node ace seed:run
```

**Output:**
```
Executing: /path/to/database/seeders/users_seeder.ts
Executing: /path/to/database/seeders/roles_seeder.ts
Seeding completed
```

**What it does:**
1. Recursively scans `database/seeders/` for `.ts` files
2. Executes each seeder's default export function
3. Runs all seeders regardless of subdirectory structure

**Note:** Seeders are executed in the order they are found. For ordered execution, use numbered prefixes (e.g., `01_users_seeder.ts`, `02_roles_seeder.ts`).

### seed:purge

Deletes all data from database tables (except migration tables).

**Syntax:**
```bash
node ace seed:purge [tableName]
```

**Examples:**

Purge all tables:
```bash
node ace seed:purge
```

Purge specific table:
```bash
node ace seed:purge users
```

**Output:**
```
Purging table: users...
✅ Table "users" purged successfully.
Purging table: roles...
✅ Table "roles" purged successfully.
✅ All tables purged successfully.
```

**What it does:**
- Deletes all rows from specified table(s)
- Skips `kysely_migration` and `kysely_migration_lock` tables
- Does NOT drop tables or reset sequences

**⚠️ Warning:** This command deletes data permanently. Use with caution.

## Utility Commands

### make:db-type

Generates TypeScript types from your database schema using `kysely-codegen`.

**Syntax:**
```bash
node ace make:db-type
```

**Output:**
```
Generating database types with kysely-codegen...
✅ Database types generated successfully!
```

**What it does:**
- Runs `npx kysely-codegen --out-file=types/db.ts`
- Generates TypeScript interfaces for your database tables
- Creates type-safe database types in `types/db.ts`

**Equivalent to:**
```bash
npx kysely-codegen --out-file=types/db.ts
```

**When to use:**
- After running migrations
- After modifying database schema
- When types are out of sync with database

## Common Workflows

### Creating and Running a Migration

```bash
# 1. Create migration
node ace make:migration users

# 2. Edit the migration file
# Add your table structure

# 3. Run the migration
node ace migration:run

# 4. Generate TypeScript types
node ace make:db-type
```

### Creating Tables with Foreign Keys

```bash
# 1. Create users table
node ace make:migration users

# 2. Create roles table with foreign key
node ace make:migration roles

# 3. Run migrations
node ace migration:run

# 4. Update types
node ace make:db-type
```

Example foreign key in roles migration:
```typescript
export async function up(db: Kysely<DB>) {
  await db.schema
    .createTable('roles')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .execute()
}
```

### Seeding Database

```bash
# 1. Create seeders
node ace make:seeder users
node ace make:seeder roles

# 2. Edit seeder files
# Add seeding logic

# 3. Run seeders
node ace seed:run
```

### Resetting Database

```bash
# 1. Purge all data
node ace seed:purge

# 2. Re-run seeders
node ace seed:run
```

### Fixing a Migration

```bash
# 1. Rollback the problematic migration
node ace migration:rollback

# 2. Edit the migration file

# 3. Run migration again
node ace migration:run

# 4. Update types
node ace make:db-type
```

### Development Cycle

```bash
# 1. Create migration
node ace make:migration posts

# 2. Run migration
node ace migration:run

# 3. Update types
node ace make:db-type

# 4. Create seeder
node ace make:seeder posts

# 5. Run seeder
node ace seed:run
```

### Team Workflow

```bash
# 1. Pull latest code
git pull origin main

# 2. Run new migrations
node ace migration:run

# 3. Update types
node ace make:db-type

# 4. Run seeders (if needed)
node ace seed:run
```

## See Also

- [Migrations and Seeders Guide](./migrations-and-seeders.md) - Detailed migration and seeder examples
- [Usage Guide](./usage.md) - Application usage patterns
- [Testing Guide](./testing.md) - Testing with database
