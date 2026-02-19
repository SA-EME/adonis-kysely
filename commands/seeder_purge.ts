import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { DB } from 'adonisjs-kysely/types/db'
import type { KyselyManager } from '#src/kysely_db'

import { BaseCommand, args } from '@adonisjs/core/ace'

export default class Seed extends BaseCommand {
  static commandName = 'seed:purge'
  static description = 'Seed database'

  #SKIP_TABLES = ['kysely_migration', 'kysely_migration_lock']

  static options: CommandOptions = {
    startApp: true,
  }

  tables: { tablename: string }[] = []

  @args.string({
    required: false,
    description: 'Specific table name to purge',
  })
  declare tableName: string

  declare database: KyselyManager

  /**
   * The complete lifecycle hook runs after the "run" method
   * and hence, we use it to close the data connection.
   */
  async completed() {
    await this.database.destroy()
  }

  private async purgeTable(tableName: keyof DB) {
    try {
      this.logger.info(`Purging table: ${tableName}...`)
      await this.database.getConnexion().deleteFrom(tableName).execute()
      this.logger.success(`Table "${tableName}" purged successfully.`)
    } catch (error) {
      this.logger.error(`Error purging table "${tableName}":`, error)
    }
  }

  private async purgeAllTables() {
    try {
      this.logger.info('Purging all tables...')

      for (const { tablename } of this.tables) {
        if (!this.#SKIP_TABLES.includes(tablename)) {
          await this.purgeTable(tablename as keyof DB)
        }
      }

      this.logger.success('All tables purged successfully.')
    } catch (error) {
      this.logger.error('Error purging all tables:', error)
    }
  }

  async run() {
    this.database = (await this.app.container.make('adonisjs-kysely')) as KyselyManager
    this.tables = await this.database
      .getConnexion()
      // @ts-ignore
      .selectFrom('pg_tables')
      .select(['tablename'])
      // @ts-ignore
      .where('schemaname', '=', 'public')
      .execute()

    if (!this.tableName) {
      await this.purgeAllTables()
    } else {
      const validTables = this.tables.map((row) => row.tablename)

      if (!validTables.includes(this.tableName as keyof DB)) {
        this.logger.error(`Table "${this.tableName}" does not exist in the database schema.`)
        return
      }

      await this.purgeTable(this.tableName as keyof DB)
    }
  }
}
