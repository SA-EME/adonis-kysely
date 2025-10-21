import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { stubsRoot } from '../stubs/main.js'

export default class MakeSeeder extends BaseCommand {
  static commandName = 'make:seeder'
  static description = 'Make a new seeder file (kysely)'
  static options: CommandOptions = {}

  @args.string({ description: 'Name of the seed file' })
  declare name: string

  async run() {
    const entity = this.app.generators.createEntity(this.name)
    const tableName = this.app.generators.tableName(entity.name)

    const fileName = `${tableName}_seeder.ts`

    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'commands/make/seeder.stub', {
      entity,
      seeder: {
        tableName,
        fileName,
      },
    })
  }
}
