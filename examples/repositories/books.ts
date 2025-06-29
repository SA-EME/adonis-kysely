import { v7 as randomUUID } from 'uuid'
import kyselyDB from 'services/kysely.js'

interface BookStore {
  name: string
  author: string
}

export default class BookRepository {
  #id: string | undefined

  withTransaction(id: string) {
    this.#id = id
  }

  async create(payload: BookStore) {
    await kyselyDB
      .getConnexion(this.#id)
      // @ts-ignore
      .insertInto('book')
      .values({
        id: randomUUID(),
        name: payload.name,
        author: payload.author,
      })
      .executeTakeFirst()
  }
}
