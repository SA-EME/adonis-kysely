import { Kysely } from 'kysely'

import type { AdonisKyselyConfig } from '#src/types/main'
import type { DB } from 'adonis-kysely/types/db'

import { ApplicationService, LoggerService } from '@adonisjs/core/types'

export class AdonisKyselyDB {
  #kyselyDB: Kysely<DB>
  // @ts-ignore
  #app: ApplicationService
  // @ts-ignore
  #logger: LoggerService
  #options: AdonisKyselyConfig

  constructor(app: ApplicationService, logger: LoggerService, options: AdonisKyselyConfig) {
    this.#app = app
    this.#logger = logger
    this.#options = options
    this.#options.dialect

    const dialect = this.#options.dialect
    this.#kyselyDB = new Kysely<DB>({
      dialect,
    })
  }

  getConnexion() {
    return this.#kyselyDB
  }
}
