import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export default class MakeMigration extends BaseCommand {
  static commandName = 'make:migration'
  static description = 'Create a new Kysely migration file'
  static options: CommandOptions = {}

  @args.string({ description: 'Name of the migration file' })
  declare name: string

  async run() {
    const entity = this.app.generators.createEntity(this.name)
    const tableName = this.app.generators.tableName(entity.name)
    const fileName = `${new Date().getTime()}_create_${tableName}_table.ts`

    const codemods = await this.createCodemods()

    const filename = fileURLToPath(import.meta.url)
    const dir = dirname(filename)
    const stubsPath = join(dir, '../stubs/commands/')

    await codemods.makeUsingStub(stubsPath, 'make/migration.stub', {
      entity,
      migration: {
        tableName,
        fileName,
      },
    })
  }
}
