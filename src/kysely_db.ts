import { ControlledTransaction, Kysely } from 'kysely'
import { v7 as randomUUID } from 'uuid'

import type { AdonisKyselyConfig } from '#src/types/main'
import type { DB } from 'adonis-kysely/types/db'

import { ApplicationService, LoggerService } from '@adonisjs/core/types'

import { TransactionContext } from '#src/transaction_context'

export class AdonisKyselyDB {
  #kyselyDB: Kysely<DB>
  // @ts-ignore
  #app: ApplicationService
  // @ts-ignore
  #logger: LoggerService
  #options: AdonisKyselyConfig

  #transactions: Map<string, ControlledTransaction<DB, []>>
  #testTransaction: ControlledTransaction<DB, []> | null = null

  constructor(
    app: ApplicationService,
    logger: LoggerService,
    options: AdonisKyselyConfig,
    private trxContext: TransactionContext
  ) {
    this.#app = app
    this.#logger = logger
    this.#options = options
    this.#options.dialect

    this.#transactions = new Map()

    const dialect = this.#options.dialect
    const log = this.#options.log
    this.#kyselyDB = new Kysely<DB>({
      dialect,
      log,
    })
  }

  public getContext() {
    return this.trxContext
  }

  private isTestMode() {
    return this.#app.getEnvironment() === 'test'
  }

  /**
   * Get transaction if id is defined instead use kysely
   *
   * @returns ControlledTransaction<DB, []> | Kysely<DB>
   */
  getConnexion() {
    if (this.isTestMode()) {
      if (this.#testTransaction) {
        return this.#testTransaction
      } else {
        throw Error('[AdonisKysely] You cannot use this function without transaction in test mode')
      }
    }

    const trxId = this.trxContext.get()
    if (trxId) {
      const transaction = this.#transactions.get(trxId)
      if (transaction) {
        return transaction
      }
    }
    return this.#kyselyDB
  }

  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.isTestMode()) {
      this.startTransaction()
      return await callback()
    }
    const uuid = randomUUID()
    const transaction = await this.#kyselyDB.startTransaction().execute()

    this.#transactions.set(uuid, transaction)

    return this.trxContext.run(uuid, async () => {
      try {
        const result = await callback()
        await transaction.commit().execute()
        return result
      } catch (err) {
        await transaction.rollback().execute()
        throw err
      } finally {
        this.#transactions.delete(uuid)
      }
    })
  }

  /**
   * Create transaction & return uuid of the transaction started
   *
   * @returns string
   */
  async startTransaction() {
    if (this.isTestMode()) {
      if (this.#testTransaction) return

      this.#testTransaction = await this.#kyselyDB.startTransaction().execute()
    }

    // Generate error if try to start a manual transaction in runInTransaction
    const activeId = this.trxContext.get()
    if (activeId) {
      throw new Error(
        `[AdonisKysely] A transaction is already active (id: ${activeId}). You can't start a new one in the same context.`
      )
    }

    const uuid = randomUUID()
    const transaction = await this.#kyselyDB.startTransaction().execute()
    this.#transactions.set(uuid, transaction)

    await this.trxContext.run(uuid, async () => {
      // set the context to be used in the next usage of getConnexion
    })

    return uuid
  }

  async commitTransaction(id?: string) {
    if (this.isTestMode() || !id) return

    const transaction = this.#transactions.get(id)
    if (transaction) {
      await transaction.commit().execute()
      this.#transactions.delete(id)
    }
  }

  async rollbackTransaction(id?: string) {
    if (this.isTestMode()) {
      if (this.#testTransaction) {
        await this.#testTransaction.rollback().execute()
        this.#testTransaction = null
      }
    } else {
      if (!id) return
      const transaction = this.#transactions.get(id)
      if (transaction) {
        await transaction.rollback().execute()
        this.#transactions.delete(id)
      }
    }
  }

  getTransaction(id: string) {
    return this.#transactions.get(id)
  }

  async listTransaction() {
    return this.#transactions.entries()
  }
}
