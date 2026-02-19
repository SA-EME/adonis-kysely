import { FileMigrationProvider, Migrator, type Kysely } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ApplicationService } from '@adonisjs/core/types'
import type { DB } from 'adonisjs-kysely/types/db'
import { KyselySeeder } from '../seeder/seeder.js'
import { dbContext } from '../context/db_context.js'
import type { KyselyManager } from '../kysely/manager.js'

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
 * import testUtils from 'adonisjs-kysely/services/test_utils'
 *
 * // Setup test database
 * await testUtils.migrate()
 * await testUtils.db().seed('test')
 *
 * // In each test: start transaction, run test, rollback
 * await testUtils.startTransaction()
 * // ... test operations
 * await testUtils.rollbackTransaction()
 * ```
 */
export class KyselyTestUtils {
  #kyselyDB: KyselyManager
  #app: ApplicationService
  #seeder: KyselySeeder

  /**
   * Active test transaction state.
   * Only one test transaction can be active at a time.
   */
  #testTransaction: {
    id: string
    signalRollback: () => void
    completed: Promise<void>
  } | null = null

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
   * Start a test transaction for isolation.
   * The transaction will be held open until rollbackTransaction() is called.
   *
   * All database operations after this call will use the test transaction,
   * and will be rolled back when rollbackTransaction() is called.
   *
   * @returns Transaction ID (can be passed to rollbackTransaction, but not required)
   *
   * @example
   * ```typescript
   * // In test setup
   * await testUtils.startTransaction()
   *
   * // ... run test code, all DB operations use the transaction
   *
   * // In test teardown
   * await testUtils.rollbackTransaction()
   * ```
   */
  async startTransaction(): Promise<string> {
    if (this.#testTransaction) {
      throw new Error('A test transaction is already active. Call rollbackTransaction() first.')
    }

    const id = crypto.randomUUID()
    let signalRollback: () => void = () => {}

    // Promise that resolves when rollback is requested
    const rollbackSignal = new Promise<void>((resolve) => {
      signalRollback = resolve
    })

    // Start dbContext and transaction
    const completed = dbContext.run(async () => {
      const db = this.#kyselyDB.getConnexion() as Kysely<DB>

      await db
        .transaction()
        .execute(async (trx) => {
          dbContext.pushTransaction(trx)

          // Wait for rollback signal
          await rollbackSignal

          // Pop before throwing to clean up stack
          dbContext.popTransaction()

          // Throw to trigger rollback (transaction not committed)
          throw new Error('__TEST_ROLLBACK__')
        })
        .catch((err) => {
          // Swallow the expected rollback error
          if (err instanceof Error && err.message !== '__TEST_ROLLBACK__') {
            throw err
          }
        })
    })

    this.#testTransaction = { id, signalRollback, completed }

    // Allow transaction to establish before returning
    await new Promise((resolve) => setImmediate(resolve))

    return id
  }

  /**
   * Rollback the active test transaction.
   *
   * This will rollback all database operations performed since startTransaction()
   * was called, ensuring test isolation.
   *
   * @param id - Optional transaction ID. If provided, must match the active transaction.
   *             If not provided, rolls back the current active transaction.
   *
   * @example
   * ```typescript
   * // Simple usage (recommended)
   * await testUtils.rollbackTransaction()
   *
   * // With explicit ID
   * const txId = await testUtils.startTransaction()
   * // ... test code
   * await testUtils.rollbackTransaction(txId)
   * ```
   */
  async rollbackTransaction(id?: string): Promise<void> {
    if (!this.#testTransaction) {
      throw new Error('No active test transaction to rollback')
    }

    if (id && id !== this.#testTransaction.id) {
      throw new Error(`Transaction ID mismatch. Expected ${this.#testTransaction.id}, got ${id}`)
    }

    // Signal the transaction to rollback
    this.#testTransaction.signalRollback()

    // Wait for transaction cleanup to complete
    await this.#testTransaction.completed

    this.#testTransaction = null
  }
}
