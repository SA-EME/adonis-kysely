import { FileMigrationProvider, Migrator } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ApplicationService } from '@adonisjs/core/types'
import { KyselySeeder } from '../seeder/seeder.js'
import { KyselyManager } from '../kysely/manager.js'

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
 * import kyselyTestUtils from 'adonisjs-kysely/services/test_utils'
 *
 * // Setup test database
 * await kyselyTestUtils.migrate()
 * await kyselyTestUtils.db().seed('test')
 *
 * // In each test: start transaction, run test, rollback
 * await kyselyTestUtils.startTransaction()
 * // ... test operations
 * await kyselyTestUtils.rollbackTransaction()
 * ```
 */
export class KyselyTestUtils {
  #kyselyDB: KyselyManager
  #app: ApplicationService
  #seeder: KyselySeeder

  constructor(kyselyDB: KyselyManager, app: ApplicationService) {
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
      seed: async (
        subfolder: string = 'test',
        priorityOrder: string[] = [],
        excludePatterns: string[] = []
      ): Promise<void> => {
        await this.#seeder.runSeeders(subfolder, priorityOrder, excludePatterns)
      },

      /**
       * Wrap subsequent DB operations in a global transaction that
       * survives across async frames (HTTP requests, etc.).
       * Returns a rollback function — call it in your test teardown.
       *
       * @example
       * test.group('users', (group) => {
       *   group.each.setup(async () => {
       *     const rollback = await kyselyTestUtils.db().wrapInGlobalTransaction()
       *     return () => rollback()
       *   })
       * })
       */
      wrapInGlobalTransaction: async (): Promise<() => Promise<void>> => {
        await this.#kyselyDB.beginGlobalTransaction()
        return () => this.#kyselyDB.rollbackGlobalTransaction()
      },
    }
  }

  async startTransaction(): Promise<string> {
    await this.#kyselyDB.beginGlobalTransaction()
    return KyselyManager.DEFAULT_CONNECTION
  }

  async rollbackTransaction(): Promise<void> {
    await this.#kyselyDB.rollbackGlobalTransaction()
  }
}
