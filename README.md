<h1 align="center">Adonis Kysely</h1>

<p align="center">
  A seamless integration of <a href="https://github.com/kysely-org/kysely">Kysely</a> (type-safe SQL query builder) with <a href="https://github.com/adonisjs">AdonisJS</a> framework.
</p>

## Features

- ✅ **Type-Safe Queries**: Full TypeScript support with database schema types
- ✅ **Execution Context**: Request-scoped data with PostgreSQL RLS support
- ✅ **Transaction Management**: Automatic transactions with nested savepoint support
- ✅ **Repository Pattern**: Clean, testable database layer architecture
- ✅ **Test Integration**: Automatic transaction wrapping for isolated tests
- ✅ **Migration & Seeding**: Kysely-based migrations and flexible seeding system
- ✅ **PostgreSQL Support**: Optimized for PostgreSQL with `set_config()` integration

## Installation

```bash
node ace configure adonisjs-kysely
```

This will:
- Create `config/kysely.ts` configuration file
- Create `types/db.ts` stub for database types
- Add `DATABASE_URL` environment variable
- Register provider and commands in `.adonisrc.ts`

### Generate Database Types

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "adonisjs-kysely/types/db": ["./types/db.ts"]
    }
  }
}
```

Generate TypeScript types from your database schema:

```bash
npx kysely-codegen --out-file=types/db.ts
```

## Documentation

📖 **Comprehensive guides available:**

- **[Usage Guide](./docs/usage.md)** - Repository pattern, transactions, getting started
- **[Context Guide](./docs/context.md)** - Execution context, request-scoped data, PostgreSQL RLS
- **[Testing Guide](./docs/testing.md)** - Test setup, transaction wrapping, isolation
- **[Migrations & Seeders](./docs/migrations-and-seeders.md)** - Database migrations, seeding
- **[Commands Guide](./docs/commands.md)** - CLI commands

## Key Concepts

### Execution Context

Wrap entry points (HTTP, CLI, jobs) in `dbContext.run()`:

```typescript
import { dbContext } from 'adonisjs-kysely/services/main'

await dbContext.run(async () => {
  // All DB operations here share the same context
})
```

### Transactions

Use `runInTransaction()` for atomic operations:

```typescript
await kyselyDB.runInTransaction(async () => {
  await createUser()
  await createRole()
  // Commits on success, rolls back on error
})
```

### Repository Pattern

Always use `kyselyDB.getConnexion()` - call fresh each time:

```typescript
// ✅ Correct - transaction aware
kyselyDB.getConnexion().selectFrom('users').selectAll()
```

### Test Isolation

Tests wrap in transactions and auto-rollback - no data persists between tests.

## Development Status

⚠️ **Note**: This package is under active development. While functional, expect potential changes and improvements. Please report any issues you encounter.

## Build from Source

### 1. Clone and Install

```bash
git clone https://github.com/SA-EME/adonisjs-kysely
cd adonisjs-kysely
npm install
```

### 2. Build Package

```bash
npm run build
npm pack
```

This generates `adonisjs-kysely-x.x.x.tgz`

### 3. Install in Your Project

```bash
npm install path/to/adonisjs-kysely-x.x.x.tgz
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.
