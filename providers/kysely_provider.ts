import type { ApplicationService } from '@adonisjs/core/types'
import type { AdonisKyselyConfig } from '../src/types/main.js'
import type { AdonisKyselyDB } from '../src/kysely_db.js'

export default class QueueProvider {
  #kysely: AdonisKyselyDB | null = null

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('adonis-kysely', async () => {
      const { AdonisKyselyDB } = await import('../src/kysely_db.js')

      const config = this.app.config.get<AdonisKyselyConfig>('kysely')
      const logger = await this.app.container.make('logger')

      this.#kysely = new AdonisKyselyDB(this.app, logger, config)

      return this.#kysely
    })
  }

  async shutdown() {}
}
