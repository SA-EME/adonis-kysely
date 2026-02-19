import type { ApplicationService } from '@adonisjs/core/types'
import type { AdonisKyselyConfig } from '../src/types/main.js'
import type { DB } from 'adonisjs-kysely/types/db'
import { Kysely } from 'kysely'
import { KyselyManager } from '../src/kysely/manager.js'
import executionContext from '../src/context/execution_context.js'

export default class KyselyProvider {
  #kysely: KyselyManager | null = null

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('adonisjs-kysely', async () => {
      const config = this.app.config.get<AdonisKyselyConfig>('kysely')

      const db = this.#createKyselyInstance(config)

      this.#kysely = new KyselyManager(db)

      return this.#kysely
    })

    this.app.container.singleton('adonisjs-kysely/execution-context', async () => {
      return executionContext
    })
  }

  #createKyselyInstance(config: AdonisKyselyConfig): Kysely<DB> {
    return new Kysely<DB>({
      dialect: config.dialect,
      log: config.log,
    })
  }

  async shutdown() {
    if (this.#kysely) {
      await this.#kysely.destroy()
    }
  }
}
