import type { DB } from 'adonisjs-kysely/types/db'
import { sql, type Kysely, type Transaction } from 'kysely'
import { dbContext } from '../context/db_context.js'
import executionContext, { type ExecutionContextValue } from '../context/execution_context.js'

export class KyselyManager {
  #savepointCounter = 0
  #globalTransactions = new Map<string, Transaction<DB>>()
  #globalTransactionsCompletion = new Map<
    string,
    {
      rollback: () => void
      completed: Promise<void>
    }
  >()

  static readonly DEFAULT_CONNECTION = 'default'

  constructor(private readonly db: Kysely<DB>) {}

  async beginGlobalTransaction(name = KyselyManager.DEFAULT_CONNECTION): Promise<void> {
    if (this.#globalTransactions.has(name)) return

    let signalRollback: () => void = () => {}
    const rollbackSignal = new Promise<void>((resolve) => {
      signalRollback = resolve
    })

    const completed = this.db
      .transaction()
      .execute(async (trx) => {
        this.#globalTransactions.set(name, trx)
        await rollbackSignal
        this.#globalTransactions.delete(name)
        throw new Error('__GLOBAL_TX_ROLLBACK__')
      })
      .catch((err) => {
        if (err instanceof Error && err.message !== '__GLOBAL_TX_ROLLBACK__') throw err
      })

    this.#globalTransactionsCompletion.set(name, { rollback: signalRollback, completed })

    await new Promise((resolve) => setImmediate(resolve))
  }

  async rollbackGlobalTransaction(name = KyselyManager.DEFAULT_CONNECTION): Promise<void> {
    const slot = this.#globalTransactionsCompletion.get(name)
    if (!slot) throw new Error(`No global transaction for "${name}"`)
    slot.rollback()
    await slot.completed
    this.#globalTransactionsCompletion.delete(name)
  }

  getConnexion(): Kysely<DB> | Transaction<DB> {
    const globalTrx = this.#globalTransactions.get(KyselyManager.DEFAULT_CONNECTION)
    if (globalTrx) {
      if (dbContext.isActive()) {
        const nested = dbContext.getCurrentTransaction()
        if (nested && nested !== globalTrx) return nested
      }
      return globalTrx
    }

    if (!dbContext.isActive()) return this.db
    const trx = dbContext.getCurrentTransaction()
    if (trx) return trx
    return dbContext.getConnection() ?? this.db
  }

  /**
   * Run a callback with execution context stored in AsyncLocalStorage.
   *
   * Context values with `injectToDb: true` are immediately set as
   * session-level PostgreSQL variables on a dedicated connection.
   * The values are available via `current_setting('app.xxx')` for all
   * queries within the callback scope, even without a transaction.
   *
   * When `runInTransaction()` is called within this scope, the transaction
   * runs on the same dedicated connection and inherits the variables.
   *
   * @example
   * ```typescript
   * // In middleware
   * await kyselyDB.runWithInjectedContext(
   *   {
   *     user_id: { value: user.id, injectToDb: true },
   *     tenant_id: { value: tenant.id, injectToDb: true },
   *   },
   *   async () => {
   *     await next()
   *   }
   * )
   *
   * // In controller/service - variables are available immediately:
   * const db = kyselyDB.getConnexion()
   * await sql`SELECT current_setting('app.user_id')`.execute(db)
   *
   * // Also available inside transactions:
   * await kyselyDB.runInTransaction(async () => {
   *   // Triggers/RLS can access: current_setting('app.user_id')
   * })
   * ```
   */
  async runWithInjectedContext<T>(
    context: Record<string, ExecutionContextValue>,
    callback: () => Promise<T>
  ): Promise<T> {
    const dbEntries = Object.entries(context).filter(([_, v]) => v.injectToDb)

    if (dbEntries.length === 0) {
      return dbContext.run({ executionContext: context }, callback)
    }

    // Acquire a dedicated connection so session-level variables
    // are visible to all queries without requiring a transaction.
    return this.db.connection().execute(async (connection) => {
      for (const [key, entry] of dbEntries) {
        await sql`SELECT set_config(${`app.${key}`}, ${String(entry.value)}, false)`.execute(
          connection
        )
      }

      try {
        return await dbContext.run({ executionContext: context, connection }, callback)
      } finally {
        for (const [key] of dbEntries) {
          await sql`SELECT set_config(${`app.${key}`}, '', false)`.execute(connection)
        }
      }
    })
  }

  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    const globalTrx = this.#globalTransactions.get(KyselyManager.DEFAULT_CONNECTION)
    if (globalTrx) {
      if (!dbContext.isActive()) {
        return dbContext.run(() => this.runInTransaction(callback))
      }
      const parent = dbContext.getCurrentTransaction() ?? globalTrx
      return this.#runWithSavepoint(parent, callback)
    }

    if (!dbContext.isActive()) {
      return dbContext.run(() => this.runInTransaction(callback))
    }

    const parentTrx = dbContext.getCurrentTransaction()

    if (!parentTrx) {
      // No existing transaction - start a new one
      // Use the dedicated connection if available so the transaction
      // inherits session-level variables set by runWithInjectedContext.
      const base = dbContext.getConnection() ?? this.db
      return base.transaction().execute(async (trx) => {
        dbContext.pushTransaction(trx)
        await this.#injectExecutionContext(trx)

        try {
          const result = await callback()
          return result
        } finally {
          dbContext.popTransaction()
        }
      })
    }

    // Already in a transaction - use savepoint for nested transaction
    return this.#runWithSavepoint(parentTrx, callback)
  }

  async #runWithSavepoint<T>(trx: Transaction<DB>, callback: () => Promise<T>): Promise<T> {
    const savepointName = `sp_${++this.#savepointCounter}`

    await sql.raw(`SAVEPOINT ${savepointName}`).execute(trx)

    try {
      const result = await callback()
      await sql.raw(`RELEASE SAVEPOINT ${savepointName}`).execute(trx)
      return result
    } catch (error) {
      await sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`).execute(trx)
      throw error
    }
  }

  async #injectExecutionContext(trx: Transaction<DB>) {
    const values = executionContext.getDbInjectedValues()

    for (const [key, value] of Object.entries(values)) {
      await sql`
        SELECT set_config(
          ${`app.${key}`},
          ${String(value)},
          true
        )
      `.execute(trx)
    }
  }

  async destroy() {
    await this.db.destroy()
  }
}
