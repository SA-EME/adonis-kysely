import { dbContext } from './db_context.js'

export interface ExecutionContextValue {
  value: unknown
  injectToDb: boolean
}

export class ExecutionContext {
  set(key: string, value: ExecutionContextValue): void {
    const store = dbContext.getStoreOrFail()
    store.executionContext.set(key, value)
  }

  get<T = unknown>(key: string): T | undefined {
    const store = dbContext.getStore()
    return store?.executionContext.get(key)?.value as T | undefined
  }

  getAll(): Record<string, ExecutionContextValue> {
    const store = dbContext.getStore()
    if (!store) return {}
    return Object.fromEntries(store.executionContext)
  }

  getDbInjectedValues(): Record<string, unknown> {
    const store = dbContext.getStore()
    if (!store) return {}

    const result: Record<string, unknown> = {}
    for (const [key, entry] of store.executionContext) {
      if (entry.injectToDb) {
        result[key] = entry.value
      }
    }
    return result
  }
}

const executionContext = new ExecutionContext()
export default executionContext
