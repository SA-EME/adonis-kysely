import { FileMigrationProvider, Migrator } from 'kysely/migration'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ApplicationService } from '@adonisjs/core/types'
import { KyselySeeder } from '../seeder/seeder.js'
import { type KyselyManager } from '../kysely/manager.js'
import { GlobalTransactionRegistry } from './global_transaction_registry.js'

export class KyselyTestUtils {
  #kyselyDB: KyselyManager
  #app: ApplicationService
  #seeder: KyselySeeder
  #registry: GlobalTransactionRegistry

  constructor(kyselyDB: KyselyManager, app: ApplicationService) {
    this.#kyselyDB = kyselyDB
    this.#app = app
    this.#seeder = new KyselySeeder(kyselyDB, app)
    this.#registry = new GlobalTransactionRegistry(kyselyDB.getDb())
    kyselyDB.setTransactionRegistry(this.#registry)
  }

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
        await this.#registry.begin()
        return () => this.#registry.rollback()
      },
    }
  }

  async startTransaction(): Promise<void> {
    await this.#registry.begin()
  }

  async rollbackTransaction(): Promise<void> {
    await this.#registry.rollback()
  }
}
