import type { AdonisKyselyDB } from '../src/kysely_db.js'
import { KyselyTestUtils } from '../src/test_utils.js'
import app from '@adonisjs/core/services/app'

let kyselyDB: AdonisKyselyDB
let kyselyTestUtils: KyselyTestUtils
if (app) {
  await app.booted(async () => {
    kyselyDB = await app.container.make('adonis-kysely')
    kyselyTestUtils = new KyselyTestUtils(kyselyDB, app)
  })
}

export { kyselyTestUtils as default }
