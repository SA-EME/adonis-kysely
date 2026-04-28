import type { DB } from 'adonisjs-kysely/types/db'
import { sql, type Kysely, type Transaction } from 'kysely'
import { dbContext } from '../context/db_context.js'
import executionContext, { type ExecutionContextValue } from '../context/execution_context.js'

export class KyselyManager {
  #savepointCounter = 0
  #transactionRegistry: { getActiveTransaction(): Transaction<DB> | undefined } | undefined

  constructor(private readonly db: Kysely<DB>) {}

  getDb(): Kysely<DB> {
    return this.db
  }

  setTransactionRegistry(registry: { getActiveTransaction(): Transaction<DB> | undefined }): void {
    this.#transactionRegistry = registry
  }

  getConnexion(): Kysely<DB> | Transaction<DB> {
    const globalTrx = this.#transactionRegistry?.getActiveTransaction()
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

  async runWithInjectedContext<T>(
    context: Record<string, ExecutionContextValue>,
    callback: () => Promise<T>
  ): Promise<T> {
    const dbEntries = Object.entries(context).filter(([_, v]) => v.injectToDb)

    if (dbEntries.length === 0) {
      return dbContext.run({ executionContext: context }, callback)
    }

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
    const globalTrx = this.#transactionRegistry?.getActiveTransaction()
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
