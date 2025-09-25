# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AdonisJS package** that integrates Kysely (a type-safe SQL query builder) with the AdonisJS framework. It follows AdonisJS package conventions from the [pkg-starter-kit](https://github.com/adonisjs/pkg-starter-kit) and provides seamless Kysely integration for AdonisJS applications.

## Development Commands

### Build and Development

- `npm run build` - Full build: lint, clean, compile, copy files, and index commands
- `npm run dev` - Development build: unlink, build, and link package locally
- `npm run build-only` - TypeScript compilation only
- `npm run clean` - Remove build directory
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Operations

- `npx kysely-codegen --out-file=types/db.ts` - Generate TypeScript types from database schema
- `node ace make:migration <name>` - Create new Kysely migration file

### Package Management

- `npm run release` - Release package using release-it
- `npm pack` - Create package tarball for local testing

## Package Architecture

This package follows AdonisJS package conventions with the following structure:

### Core Files

- **`index.ts`** - Package entrypoint, exports main public API
- **`configure.ts`** - Configuration hook for `node ace configure adonis-kysely`
- **`providers/kysely_provider.ts`** - AdonisJS service provider for dependency injection

### Key Directories

- **`src/`** - Core package source code
  - `kysely_db.ts` - Main database service implementation
  - `transaction_context.ts` - AsyncLocalStorage transaction context
  - `transaction_runner.ts` - Transaction management utilities
  - `define_config.ts` - Configuration definition helpers
  - `types/` - TypeScript type definitions
- **`services/`** - Service layer exports for user applications
  - `kysely.ts` - Main service export (`adonis-kysely/services/main`)
  - `transaction.ts` - Transaction service export (`adonis-kysely/services/transaction`)
- **`commands/`** - AdonisJS commands
  - `make_migration.ts` - Migration generation command
- **`stubs/`** - Template files for code generation
  - `config/kysely.stub` - Configuration file template
  - `types/db.stub` - Database types template
- **`providers/`** - AdonisJS providers for service registration

### Core Components

1. **AdonisKyselyDB** (`src/kysely_db.ts`) - Main database service that:
   - Manages Kysely database connections
   - Handles transaction lifecycle (manual and automatic)
   - Supports test mode with automatic transaction rollback
   - Provides seeding capabilities

2. **Transaction System** - Dual transaction approach:
   - **Automatic transactions**: `runInTransaction()` auto-commits/rollbacks
   - **Manual transactions**: `startTransaction()` with manual control via `ScopedTransactionRunner`

3. **KyselyProvider** (`providers/kysely_provider.ts`):
   - Registers `adonis-kysely` and `adonis-kysely:transaction-runner` services
   - Integrates with AdonisJS dependency injection container
   - Follows singleton pattern for service registration

### Package Integration

The package integrates with AdonisJS applications through:

1. **Service Registration**: Provider registers services in the IoC container
2. **Command Registration**: Commands are indexed and registered via `.adonisrc.ts`
3. **Configuration**: Uses standard AdonisJS config pattern with `config/kysely.ts`
4. **Type Safety**: Generates and uses database types at `types/db.ts`

### Export Strategy

Following AdonisJS conventions, the package uses Node.js subpath exports:

- `adonis-kysely` - Main package (from `index.ts`)
- `adonis-kysely/services/main` - Main Kysely service
- `adonis-kysely/services/transaction` - Transaction runner service
- `adonis-kysely/commands` - Migration commands
- `adonis-kysely/kysely_provider` - Provider for manual registration
- `adonis-kysely/types/db` - Database type definitions

### Key Features

- **Test Mode Support**: Automatic transaction wrapping in test environment
- **Transaction Context**: Uses AsyncLocalStorage for transaction scoping
- **Type Safety**: Full TypeScript support with database schema types
- **Migration Commands**: AdonisJS-style migration generation
- **Seeding**: Built-in seeder runner functionality
- **PostgreSQL Support**: Currently focused on PostgreSQL databases

### Configuration Requirements

- Database types must be generated: `npx kysely-codegen --out-file=types/db.ts`
- Requires `types/db.ts` for TypeScript integration
- PostgreSQL connection via `DATABASE_URL` environment variable
- AdonisJS application configuration in `config/kysely.ts`

### Installation & Setup

The package provides automatic configuration via:

```bash
node ace configure adonis-kysely
```

This setup:

- Creates `config/kysely.ts` configuration file
- Creates `types/db.ts` type definition stub
- Adds `DATABASE_URL` environment variable
- Registers provider and commands in `.adonisrc.ts`

### Testing Integration

The package automatically wraps database operations in transactions during testing, preventing data persistence and ensuring test isolation.
