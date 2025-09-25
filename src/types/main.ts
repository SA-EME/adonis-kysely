import type {
  PostgresDialect,
  SqliteDialect,
  MysqlDialect,
  LogEvent,
  // ControlledTransaction,
} from 'kysely'
// import type { DB } from 'adonis-kysely/types/db'

export type LogLevel = 'query' | 'error'

export type LogConfig = LogLevel[] | ((event: LogEvent) => void)

export type AdonisKyselyConfig = {
  dialect: PostgresDialect | SqliteDialect | MysqlDialect
  log?: LogConfig
  advanced: {
    bypass_test_security: boolean
  }
}

// export interface TransactionData {
//   connection: ControlledTransaction<DB>
//   savepoint?: ControlledTransaction<DB>
//   parentId?: string
//   depth: number
// }
