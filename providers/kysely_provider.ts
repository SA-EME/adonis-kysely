import type { ApplicationService } from '@adonisjs/core/types'
import type { AdonisKyselyConfig } from '../src/types/main.js'
import type { AdonisKyselyDB } from '../src/kysely_db.js'
import { TransactionContext } from '../src/transaction_context.js'

export default class KyselyProvider {
  #kysely: AdonisKyselyDB | null = null

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('adonis-kysely', async () => {
      const { AdonisKyselyDB } = await import('../src/kysely_db.js')

      const config = this.app.config.get<AdonisKyselyConfig>('kysely')
      const logger = await this.app.container.make('logger')
      const transaction = new TransactionContext()

      this.#kysely = new AdonisKyselyDB(this.app, logger, config, transaction)

      return this.#kysely
    })

    this.app.container.singleton('adonis-kysely:transaction-runner', async () => {
      const { ScopedTransactionRunner } = await import('../src/transaction_runner.js')
      const kysely = await this.app.container.make('adonis-kysely')
      return new ScopedTransactionRunner(kysely)
    })
  }

  async shutdown() {}
}
