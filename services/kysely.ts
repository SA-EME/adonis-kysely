import { AdonisKyselyDB } from '#src/kysely_db'

import app from '@adonisjs/core/services/app'

let kyselyDB: AdonisKyselyDB
if (app) {
  await app.booted(async () => {
    kyselyDB = await app.container.make('adonis-kysely')
  })
}

export { kyselyDB as default }
