# Changelog

All notable changes to adonisjs-kysely are documented in this file.

## [0.4.0] - 2026-04-28

### Features

- Implemented global transaction management with `wrapInGlobalTransaction()` for test isolation across async frames — 8e23308 — @CappieGold

### Refactor

- Extracted global transaction state out of `KyselyManager` into a dedicated `GlobalTransactionRegistry` — 918ed51 — @KalvinVilla

---

## [0.3.1] - 2026-02-19

### Chore

- Updated docs: `testUtils` renamed to `kyselyTestUtils` — 6dace9f — @KalvinVilla
- Seeder run command now picks up `.js` files in production — 52decba — @KalvinVilla

### Fixes

- Renamed all package references from `adonis-kysely` to `adonisjs-kysely` — fc40630 — @KalvinVilla

---

## [0.2.0] - 2026-02-02

### Features

- **Package rename + execution context + DB variable injection** — renamed package to `adonisjs-kysely`; added `ExecutionContext` for request-scoped data and PostgreSQL `set_config()` integration — aee2b01 — @KalvinVilla

---

## [0.1.0] - 2025-10-21

### Features

- **Basic CLI commands** — added Ace commands for migrations and seeders — bad78f4 — @KalvinVilla
- **Nested transactions & test utilities** — added savepoint-based nested transaction support and `KyselyTestUtils` for test isolation — bccab50 — @KalvinVilla

---

## [0.0.1] - 2025-07-01

### Features

- **Log system** — added query and error logging configuration — 955a584 — @KalvinVilla
- **Multiple dialect support** — support for PostgreSQL, SQLite, and MySQL dialects — dad6c86 — @KalvinVilla
- **Transaction system** — initial transaction management via `runInTransaction()` — 0bc82d9 — @KalvinVilla

### Chore

- Updated readme — 36a26d5 — @KalvinVilla
- Core package functions scaffolded — 7fff6b5, 8e44637 — @KalvinVilla
