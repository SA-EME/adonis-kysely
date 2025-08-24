import type { PostgresDialect, SqliteDialect, MysqlDialect } from 'kysely'

export type AdonisKyselyConfig = {
  dialect: PostgresDialect | SqliteDialect | MysqlDialect
}
