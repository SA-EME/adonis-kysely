import type { PostgresDialect, SqliteDialect, MysqlDialect, LogEvent } from 'kysely'

export type LogLevel = 'query' | 'error'

export type LogConfig = LogLevel[] | ((event: LogEvent) => void)

export type AdonisKyselyConfig = {
  dialect: PostgresDialect | SqliteDialect | MysqlDialect
  log?: LogConfig
}
