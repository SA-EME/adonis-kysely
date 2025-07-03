import type { LogConfig, PostgresDialect } from 'kysely'

export type AdonisKyselyConfig = {
  dialect: PostgresDialect
  log?: LogConfig
}
