<h1 align="center">Adonis Kysely</h1>

<p align="center">
  A seamless integration of <a href="https://github.com/kysely-org/kysely">Kysely</a> (type-safe SQL query builder) with <a href="https://github.com/adonisjs">AdonisJS</a> framework.
</p>

## Features

- ✅ **Type-Safe Queries**: Full TypeScript support with database schema types
- ✅ **Transaction Management**: Automatic and manual transaction modes with nested transaction support
- ✅ **Repository Pattern**: Clean, testable database layer architecture
- ✅ **Test Integration**: Automatic transaction wrapping for isolated tests
- ✅ **Migration & Seeding**: Kysely-based migrations and flexible seeding system
- ✅ **PostgreSQL Support**: Optimized for PostgreSQL databases

## Installation

```bash
node ace configure adonis-kysely
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
      "adonis-kysely/types/db": ["./types/db.ts"]
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

- **[Usage Guide](./docs/usage.md)** - Application usage, repository pattern, transaction modes
- **[Testing Guide](./docs/testing.md)** - Test setup, transaction wrapping, examples
- **[Migrations & Seeders](./docs/migrations-and-seeders.md)** - Database migrations, seeding, type generation

## Key Concepts

### Transaction Modes

| Mode | When to Use |
|------|-------------|
| `runInTransaction()` | Simple, single-level transactions with automatic commit/rollback |
| `startTransaction()` | Manual control, nested transactions (savepoints), partial rollbacks |

### Repository Pattern

Always use `kyselyDB.getConnexion()` in your repositories to ensure transaction-aware queries:

```typescript
// ✅ Correct - transaction aware
kyselyDB.getConnexion().selectFrom('users').selectAll()

// ❌ Wrong - bypasses transaction system
// Don't create separate Kysely instances
```

### Test Isolation

Tests automatically wrap in transactions and roll back - no data persists between tests.

## Development Status

⚠️ **Note**: This package is under active development. While functional, expect potential changes and improvements. Please report any issues you encounter.

## Build from Source

### 1. Clone and Install

```bash
git clone https://github.com/SA-EME/adonis-kysely
cd adonis-kysely
npm install
```

### 2. Build Package

```bash
npm run build
npm pack
```

This generates `adonis-kysely-x.x.x.tgz`

### 3. Install in Your Project

```bash
npm install path/to/adonis-kysely-x.x.x.tgz
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.
