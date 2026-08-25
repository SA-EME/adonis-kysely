import type { DB } from 'adonisjs-kysely/types/db'
import type { Kysely, Transaction } from 'kysely'

const ROLLBACK_SIGNAL = '__GLOBAL_TX_ROLLBACK__'

export class GlobalTransactionRegistry {
  #transaction: Transaction<DB> | undefined
  #completion:
    | {
        started: Promise<void>
        rollback: () => void
        completed: Promise<void>
      }
    | undefined

  constructor(private readonly db: Kysely<DB>) {}

  async begin(): Promise<void> {
    if (this.#completion !== undefined) {
      await this.#completion.started
      return
    }

    let signalStarted: () => void = () => {}
    let signalStartFailed: (error: unknown) => void = () => {}
    const started = new Promise<void>((resolve, reject) => {
      signalStarted = resolve
      signalStartFailed = reject
    })

    let signalRollback: () => void = () => {}
    const rollbackSignal = new Promise<void>((resolve) => {
      signalRollback = resolve
    })

    const completed = this.db
      .transaction()
      .execute(async (trx) => {
        this.#transaction = trx
        // Resolve from inside the callback: the connection is acquired and
        // BEGIN has been issued, so the transaction is usable from here on.
        signalStarted()
        await rollbackSignal
        throw new Error(ROLLBACK_SIGNAL)
      })
      .catch((error) => {
        if (error instanceof Error && error.message === ROLLBACK_SIGNAL) return
        // Surface a failure to open the transaction through begin(). Once
        // started() has resolved this is a no-op and the error is swallowed,
        // which is what we want: rollback() must never leave a connection
        // checked out just because the transaction was already aborted.
        signalStartFailed(error)
      })
      .finally(() => {
        this.#transaction = undefined
      })

    this.#completion = { started, rollback: signalRollback, completed }

    try {
      await started
    } catch (error) {
      await completed
      this.#completion = undefined
      throw error
    }
  }

  async rollback(): Promise<void> {
    if (!this.#completion) throw new Error('No active global transaction to rollback')

    const { rollback, completed } = this.#completion
    try {
      rollback()
      await completed
    } finally {
      this.#completion = undefined
      this.#transaction = undefined
    }
  }

  getActiveTransaction(): Transaction<DB> | undefined {
    return this.#transaction
  }
}
