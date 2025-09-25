import { AsyncLocalStorage } from 'node:async_hooks'
import { DB } from 'adonis-kysely/types/db'
import { ControlledTransaction } from 'kysely'
// import type { TransactionData } from '#src/types/main'

interface TransactionContextStore {
  transactionStack: string[]
}

export class TransactionContext {
  #storage = new AsyncLocalStorage<TransactionContextStore>()
  #transactions = new Map<string, ControlledTransaction<DB>>()

  run<T>(trxId: string, callback: () => Promise<T>): Promise<T> {
    const currentStore = this.#storage.getStore()
    const newStack = currentStore ? [...currentStore.transactionStack, trxId] : [trxId]

    return this.#storage.run({ transactionStack: newStack }, callback)
  }

  get(): string | null {
    const store = this.#storage.getStore()
    if (store && store.transactionStack.length > 0) {
      return store.transactionStack[store.transactionStack.length - 1]
    }
    return null
  }

  getStack(): string[] {
    const store = this.#storage.getStore()
    return store?.transactionStack ?? []
  }

  getTransaction(id: string): ControlledTransaction<DB> | undefined {
    return this.#transactions.get(id)
  }

  setTransaction(id: string, data: ControlledTransaction<DB>): void {
    this.#transactions.set(id, data)
  }

  removeTransaction(id: string): void {
    this.#transactions.delete(id)
  }

  getAllTransactions(): Map<string, ControlledTransaction<DB>> {
    return new Map(this.#transactions)
  }

  clear() {
    this.#storage.disable()
  }

  clearGlobal() {
    this.#transactions.clear()
    this.clear()
  }
}
