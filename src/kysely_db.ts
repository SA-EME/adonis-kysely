import { ControlledTransaction, Kysely } from 'kysely'
import { v7 as randomUUID } from 'uuid'

import type { AdonisKyselyConfig } from './types/main.js'
import type { DB } from 'adonis-kysely/types/db'

import { ApplicationService, LoggerService } from '@adonisjs/core/types'
import { TransactionContext } from './transaction_context.js'

export class AdonisKyselyDB {
  #kyselyDB: Kysely<DB>
  #app: ApplicationService
  #logger: LoggerService
  #options: AdonisKyselyConfig
  #trxContext: TransactionContext
  #transactionStack: string[] = []

  constructor(
    app: ApplicationService,
    logger: LoggerService,
    options: AdonisKyselyConfig,
    trxContext: TransactionContext
  ) {
    this.#app = app
    this.#logger = logger
    this.#options = options
    this.#trxContext = trxContext

    this.#kyselyDB = new Kysely<DB>({
      dialect: options.dialect,
      log: options.log,
    })
  }

  /**
   * Returns the transaction context instance
   */
  getContext() {
    return this.#trxContext
  }

  /**
   * Checks if the application is running in test mode
   */
  private isTestMode() {
    return this.#app.inTest
  }

  /**
   * Resolves the appropriate database connection or transaction to use.
   * Priority: 1) Transaction stack (manual transactions), 2) AsyncLocalStorage context (automatic transactions), 3) Direct DB connection
   */
  getConnexion(): Kysely<DB> | ControlledTransaction<DB> {
    if (this.#transactionStack.length > 0) {
      const activeTransactionId = this.#transactionStack[this.#transactionStack.length - 1]
      const activeTrx = this.#trxContext.getTransaction(activeTransactionId)
      if (activeTrx) {
        this.#logger.debug(
          `[AdonisKysely] Using active transaction from stack: ${activeTransactionId}`
        )
        return activeTrx
      } else {
        this.#logger.warn(
          `[AdonisKysely] Active transaction ${activeTransactionId} not found in transactions map`
        )
      }
    }

    const currentTrxId = this.#trxContext.get()
    if (currentTrxId) {
      const trx = this.#trxContext.getTransaction(currentTrxId)
      if (trx) {
        this.#logger.debug(`[AdonisKysely] Using AsyncLocalStorage transaction: ${currentTrxId}`)
        return trx
      } else {
        this.#logger.warn(
          `[AdonisKysely] Transaction ${currentTrxId} found in context but not in transactions map`
        )
      }
    }

    this.#logger.debug('[AdonisKysely] Using direct database connection (no transaction)')
    return this.#kyselyDB
  }

  /**
   * Starts a new database transaction (manual mode).
   * Supports nested transactions using savepoints when called within an existing transaction context.
   * @returns Transaction ID for later commit/rollback
   */
  async startTransaction(): Promise<string> {
    const id = randomUUID()

    let parentTrx: ControlledTransaction<DB> | null = null
    let parentTrxId: string | null = null

    const currentTrxId = this.#trxContext.get()
    if (currentTrxId) {
      parentTrx = this.#trxContext.getTransaction(currentTrxId) || null
      parentTrxId = currentTrxId
    }

    if (parentTrx && parentTrxId) {
      const nestedTrx = await parentTrx.startTransaction().execute()
      this.#trxContext.setTransaction(id, nestedTrx)
      this.#logger.debug(`[AdonisKysely] Started nested transaction ${id} (parent: ${parentTrxId})`)
    } else {
      const rootTrx = await this.#kyselyDB.startTransaction().execute()
      this.#trxContext.setTransaction(id, rootTrx)
      this.#logger.debug(`[AdonisKysely] Started root transaction ${id}`)
    }

    this.#transactionStack.push(id)
    this.#logger.debug(`[AdonisKysely] Transaction stack: [${this.#transactionStack.join(', ')}]`)

    return id
  }

  /**
   * Commits a transaction. Automatically resolves transaction ID from context if not provided.
   * Skips commit in test mode to enable automatic rollback.
   * @param id - Optional transaction ID to commit
   */
  async commitTransaction(id?: string) {
    if (this.isTestMode()) {
      this.#logger.debug('[AdonisKysely] Skipping commit in test mode')
      return
    }

    const parentTrxId = this.#trxContext.get()
    const trxId =
      id ||
      parentTrxId ||
      (this.#transactionStack.length > 0
        ? this.#transactionStack[this.#transactionStack.length - 1]
        : null)

    if (!trxId) {
      this.#logger.warn('[AdonisKysely] No transaction to commit')
      return
    }

    const trx = this.#trxContext.getTransaction(trxId)
    if (!trx) {
      this.#logger.warn(`[AdonisKysely] Transaction ${trxId} not found`)
      return
    }

    try {
      await trx.commit().execute()
      this.#logger.debug(`[AdonisKysely] Committed transaction ${trxId}`)
    } catch (err: any) {
      this.#logger.error(`[AdonisKysely] Failed to commit transaction ${trxId}: ${err.message}`)
      throw err
    } finally {
      this.#trxContext.removeTransaction(trxId)

      const stackIndex = this.#transactionStack.indexOf(trxId)
      if (stackIndex >= 0) {
        this.#transactionStack.splice(stackIndex, 1)
        this.#logger.debug(
          `[AdonisKysely] Transaction stack after commit: [${this.#transactionStack.join(', ')}]`
        )
      }
    }
  }

  /**
   * Rolls back a transaction. Automatically resolves transaction ID from context if not provided.
   * @param id - Optional transaction ID to rollback
   */
  async rollbackTransaction(id?: string) {
    const parentTrxId = this.#trxContext.get()
    const trxId =
      id ||
      parentTrxId ||
      (this.#transactionStack.length > 0
        ? this.#transactionStack[this.#transactionStack.length - 1]
        : null)

    if (!trxId) {
      this.#logger.warn('[AdonisKysely] No transaction to rollback')
      return
    }

    const trx = this.#trxContext.getTransaction(trxId)
    if (!trx) {
      this.#logger.warn(`[AdonisKysely] Transaction ${trxId} not found`)
      return
    }

    try {
      await trx.rollback().execute()
      this.#logger.debug(`[AdonisKysely] Rolled back transaction ${trxId}`)
    } catch (err: any) {
      this.#logger.error(`[AdonisKysely] Failed to rollback transaction ${trxId}: ${err.message}`)
      throw err
    } finally {
      this.#trxContext.removeTransaction(trxId)

      const stackIndex = this.#transactionStack.indexOf(trxId)
      if (stackIndex >= 0) {
        this.#transactionStack.splice(stackIndex, 1)
        this.#logger.debug(
          `[AdonisKysely] Transaction stack after rollback: [${this.#transactionStack.join(', ')}]`
        )
      }
    }
  }

  /**
   * Executes a callback within an automatic transaction context.
   * Automatically commits on success or rolls back on error.
   * @param callback - Async function to execute within transaction
   * @returns Result of the callback function
   */
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    const id = await this.startTransaction()
    try {
      const result = await this.#trxContext.run(id, callback)
      await this.commitTransaction(id)
      return result
    } catch (err) {
      await this.rollbackTransaction(id)
      throw err
    }
  }

  /**
   * Retrieves a transaction instance by its ID
   * @param id - Transaction ID
   * @returns Transaction instance or null if not found
   */
  getTransaction(id: string) {
    const transaction = this.#trxContext.getTransaction(id)
    if (!transaction) return null

    return transaction
  }

  /**
   * Returns a list of all active transaction IDs
   */
  listTransaction() {
    return Array.from(this.#trxContext.getAllTransactions().keys())
  }

  /**
   * Rolls back all active transactions in reverse order (newest first).
   * Used for cleanup during testing or application shutdown.
   */
  async rollbackAll() {
    const allTransactions = this.#trxContext.getAllTransactions()

    const transactionIds = Array.from(allTransactions.keys()).slice().reverse()

    for (const id of transactionIds) {
      await this.rollbackTransaction(id)
    }

    this.#transactionStack = []
    this.#logger.debug('[AdonisKysely] Cleared transaction stack')
  }

  /**
   * Destroys the database connection and rolls back all active transactions.
   * Should be called during application shutdown.
   */
  async destroy() {
    try {
      await this.rollbackAll()
      await this.#kyselyDB.destroy()
      this.#logger.debug('[AdonisKysely] Database connection destroyed')
    } catch (err: any) {
      this.#logger.error(`[AdonisKysely] Failed to destroy DB: ${err.message}`)
    }
  }
}
