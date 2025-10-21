import { FileMigrationProvider, Migrator } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ApplicationService } from '@adonisjs/core/types'
// import { FileMigrationProvider } from '#src/file_migration_provider'
import { KyselySeeder } from './seeder.js'

/**
 * Test utilities for AdonisJS applications using Kysely
 *
 * This class provides simplified database operations for testing:
 * - Running migrations
 * - Seeding test data
 * - Managing transactions (with automatic rollback for test isolation)
 *
 * @example
 * ```typescript
 * import testUtils from 'adonis-kysely/services/test_utils'
 *
 * // Setup test database
 * await testUtils.migrate()
 * await testUtils.db().seed('test')
 *
 * // In each test: start transaction, run test, rollback
 * await testUtils.startTransaction()
 * // ... test operations
 * await testUtils.rollbackTransaction() // No ID needed
 * ```
 */
export class KyselyTestUtils {
  #kyselyDB: any
  #app: ApplicationService
  #seeder: KyselySeeder

  constructor(kyselyDB: any, app: ApplicationService) {
    this.#kyselyDB = kyselyDB
    this.#app = app
    this.#seeder = new KyselySeeder(kyselyDB, app)
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    const migrationFolder = this.#app.migrationsPath()

    const migrator = new Migrator({
      db: this.#kyselyDB.getConnexion(),
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder,
      }),
    })

    const { error, results } = await migrator.migrateToLatest()

    if (error) {
      console.error('Failed to run migrations:', error)
      throw error
    }

    if (results) {
      results.forEach((it) => {
        if (it.status === 'Success') {
          console.log(`Migration "${it.migrationName}" was executed successfully`)
        } else if (it.status === 'Error') {
          console.error(`Failed to execute migration "${it.migrationName}"`)
        }
      })
    }
  }

  /**
   * Database utilities for seeding
   */
  db() {
    return {
      /**
       * Run seeders for the specified subfolder
       * @param subfolder - Subfolder (e.g. 'test', 'main')
       * @param priorityOrder - Seeders to execute first (in order)
       * @param excludePatterns - Patterns to exclude from execution
       */
      seed: async (
        subfolder: string = 'test',
        priorityOrder: string[] = [],
        excludePatterns: string[] = []
      ): Promise<void> => {
        await this.#seeder.runSeeders(subfolder, priorityOrder, excludePatterns)
      },
    }
  }

  /**
   * Start a transaction and return its ID
   * Delegates to the main AdonisKyselyDB instance
   */
  async startTransaction(): Promise<string> {
    return await this.#kyselyDB.startTransaction()
  }

  /**
   * Rollback a transaction
   * @param id - Optional transaction ID. If not provided, will rollback the most recent active transaction.
   *             In test scenarios, you typically don't need to pass this parameter.
   *
   * @example
   * ```typescript
   * // Typical test usage (no ID needed)
   * await testUtils.startTransaction()
   * // ... test operations
   * await testUtils.rollbackTransaction() // Automatically finds the active transaction
   *
   * // Manual ID usage (if needed)
   * const txId = await testUtils.startTransaction()
   * await testUtils.rollbackTransaction(txId)
   * ```
   *
   * Delegates to the main AdonisKyselyDB instance
   */
  async rollbackTransaction(id?: string): Promise<void> {
    await this.#kyselyDB.rollbackTransaction(id)
  }
}
