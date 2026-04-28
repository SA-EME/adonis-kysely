import type { DB } from 'adonisjs-kysely/types/db'
import type { Kysely, Transaction } from 'kysely'

export class GlobalTransactionRegistry {
  #transaction: Transaction<DB> | undefined
  #completion:
    | {
        rollback: () => void
        completed: Promise<void>
      }
    | undefined

  constructor(private readonly db: Kysely<DB>) {}

  async begin(): Promise<void> {
    if (this.#transaction !== undefined) return

    let signalRollback: () => void = () => {}
    const rollbackSignal = new Promise<void>((resolve) => {
      signalRollback = resolve
    })

    const completed = this.db
      .transaction()
      .execute(async (trx) => {
        this.#transaction = trx
        await rollbackSignal
        this.#transaction = undefined
        throw new Error('__GLOBAL_TX_ROLLBACK__')
      })
      .catch((err) => {
        if (err instanceof Error && err.message !== '__GLOBAL_TX_ROLLBACK__') throw err
      })

    this.#completion = { rollback: signalRollback, completed }

    await new Promise((resolve) => setImmediate(resolve))
  }

  async rollback(): Promise<void> {
    if (!this.#completion) throw new Error('No active global transaction to rollback')
    this.#completion.rollback()
    await this.#completion.completed
    this.#completion = undefined
  }

  getActiveTransaction(): Transaction<DB> | undefined {
    return this.#transaction
  }
}
