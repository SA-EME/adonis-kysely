import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import string from '@adonisjs/core/helpers/string'

import { stubsRoot } from '../stubs/main.js'

/**
 * Names from which the table to create can be inferred, e.g.
 * `create_users_table` or `create_users`.
 */
const CREATE_MIGRATION_NAME = /^create_(.+?)(?:_table)?$/

export default class MakeMigration extends BaseCommand {
  static commandName = 'make:migration'
  static description = 'Create a new migration file (kysely)'
  static options: CommandOptions = {}

  @args.string({ description: 'Name of the migration file' })
  declare name: string

  @flags.string({ description: 'Generate a migration creating the given table' })
  declare create?: string

  @flags.string({ description: 'Generate a migration altering the given table' })
  declare table?: string

  async run() {
    if (this.create && this.table) {
      this.logger.error('Pass either --create or --table, not both')
      this.exitCode = 1
      return
    }

    const entity = this.app.generators.createEntity(this.name)
    const migrationName = string.snakeCase(entity.name)
    const { isCreate, isAlter, tableName } = this.#resolveMigration(migrationName)

    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'commands/make/migration.stub', {
      entity,
      migration: {
        isCreate,
        isAlter,
        tableName,
        fileName: `${new Date().getTime()}_${migrationName}.ts`,
      },
    })
  }

  /**
   * An explicit flag always wins. Without one, only a `create_*` name yields a
   * table skeleton: every other migration (extensions, indexes, constraints,
   * backfills) gets an empty body.
   */
  #resolveMigration(migrationName: string) {
    if (this.create) {
      return {
        isCreate: true,
        isAlter: false,
        tableName: this.app.generators.tableName(this.create),
      }
    }

    if (this.table) {
      return {
        isCreate: false,
        isAlter: true,
        tableName: this.app.generators.tableName(this.table),
      }
    }

    const inferred = migrationName.match(CREATE_MIGRATION_NAME)
    if (inferred) {
      return {
        isCreate: true,
        isAlter: false,
        tableName: this.app.generators.tableName(inferred[1]),
      }
    }

    return { isCreate: false, isAlter: false, tableName: undefined }
  }
}
