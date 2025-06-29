import { v7 as randomUUID } from 'uuid'
import kyselyDB from 'services/kysely.js'

interface TagStore {
  name: string
}

export default class TagRepository {
  #id: string | undefined

  withTransaction(id: string) {
    this.#id = id
  }

  async create(payload: TagStore) {
    await kyselyDB
      .getConnexion(this.#id)
      // @ts-ignore
      .insertInto('tag')
      .values({
        id: randomUUID(),
        name: payload.name,
      })
      .executeTakeFirst()
  }
}
