import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { KyselyManager } from '#src/kysely_db'

import fs from 'node:fs/promises'
import path from 'node:path'

import { BaseCommand } from '@adonisjs/core/ace'

export default class Seed extends BaseCommand {
  static commandName = 'seed:run'
  static description = 'Seed database'

  static options: CommandOptions = {
    startApp: true,
  }

  declare database: KyselyManager

  /**
   * The complete lifecycle hook runs after the "run" method
   * and hence, we use it to close the data connection.
   */
  async completed() {
    await this.database.destroy()
  }

  async getSeedersFiles(dir: string): Promise<string[]> {
    let filesList: string[] = []
    const files = await fs.readdir(dir, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(dir, file.name)
      if (file.isDirectory()) {
        const nestedFiles = await this.getSeedersFiles(fullPath)
        filesList = filesList.concat(nestedFiles)
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        if (!file.name.endsWith('.map')) {
          filesList.push(fullPath)
        }
      }
    }

    return filesList
  }

  async run() {
    this.database = (await this.app.container.make('adonisjs-kysely')) as KyselyManager

    const seedersPath = path.join(this.app.seedersPath())
    const files = await this.getSeedersFiles(seedersPath)

    for (const file of files) {
      const seeder = await import(file)
      if (typeof seeder.default === 'function') {
        this.logger.info(`Executing: ${file}`)
        await seeder.default(this.database.getConnexion())
      }
    }

    this.logger.info('Seeding completed')
  }
}
