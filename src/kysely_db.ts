import { ControlledTransaction, Kysely } from 'kysely'
import { v7 as randomUUID } from 'uuid'

import type { AdonisKyselyConfig } from '#src/types/main'
import type { DB } from 'adonis-kysely/types/db'

import { ApplicationService, LoggerService } from '@adonisjs/core/types'

export class AdonisKyselyDB {
  #kyselyDB: Kysely<DB>
  // @ts-ignore
  #app: ApplicationService
  // @ts-ignore
  #logger: LoggerService
  #options: AdonisKyselyConfig

  #transactions: Map<string, ControlledTransaction<DB, []>>

  constructor(app: ApplicationService, logger: LoggerService, options: AdonisKyselyConfig) {
    this.#app = app
    this.#logger = logger
    this.#options = options
    this.#options.dialect

    this.#transactions = new Map()

    const dialect = this.#options.dialect
    this.#kyselyDB = new Kysely<DB>({
      dialect,
    })
  }

  /**
   * Get transaction if id is defined instead use kysely
   *
   * @returns ControlledTransaction<DB, []> | Kysely<DB>
   */
  getConnexion(id?: string) {
    if (id) {
      const transaction = this.#transactions.get(id)
      if (transaction) {
        return transaction
      }
    }
    return this.#kyselyDB
  }

  /**
   * Create transaction & return uuid of the transaction started
   *
   * @returns string
   */
  async startTransaction() {
    const uuid = randomUUID()
    const transaction = await this.#kyselyDB.startTransaction().execute()

    this.#transactions.set(uuid, transaction)
    return uuid
  }

  async commitTransaction(id: string) {
    const transaction = this.#transactions.get(id)
    if (transaction) {
      transaction.commit().execute()
      this.#transactions.delete(id)
    }
  }

  async rollbackTransaction(id: string) {
    const transaction = this.#transactions.get(id)
    if (transaction) {
      transaction.rollback().execute()
      this.#transactions.delete(id)
    }
  }

  async getTransaction(id: string) {
    return this.#transactions.get(id)
  }
}
