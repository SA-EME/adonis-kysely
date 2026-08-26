import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { KyselyManager } from '#src/kysely_db'

import * as fs from 'node:fs/promises'
import path from 'node:path'

import { BaseCommand } from '@adonisjs/core/ace'
import { FileMigrationProvider, Migrator } from 'kysely/migration'

export default class MigrationRun extends BaseCommand {
  static commandName = 'migration:run'
  static description = 'Migrate database by running pending migrations (kysely)'
  static options: CommandOptions = {
    startApp: true,
  }

  declare migrator: Migrator

  declare database: KyselyManager

  /**
   * Prepare lifecycle hook runs before the "run" method
   * and hence, we use it to prepare the migrator
   * instance
   */
  async prepare() {
    this.database = (await this.app.container.make('adonisjs-kysely')) as KyselyManager
    this.migrator = new Migrator({
      db: this.database.getConnexion(),
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: this.app.migrationsPath(),
      }),
    })
  }

  /**
   * The complete lifecycle hook runs after the "run" method
   * and hence, we use it to close the data connection.
   */
  async completed() {
    await this.database.destroy()
  }

  /**
   * Runs migrations up method
   */
  async run() {
    const { error, results } = await this.migrator.migrateToLatest()

    /**
     * Print results
     */
    results?.forEach((it) => {
      switch (it.status) {
        case 'Success':
          this.logger.success(`migration "${it.migrationName}" was executed successfully`)
          break
        case 'Error':
          this.logger.error(`failed to execute migration "${it.migrationName}"`)
          break
        case 'NotExecuted':
          this.logger.info(`migration pending "${it.migrationName}"`)
      }
    })

    /**
     * Display error
     */
    if (error) {
      this.logger.error('Failed to migrate')
      this.error = error
      this.exitCode = 1
    }
  }
}
