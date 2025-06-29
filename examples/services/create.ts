import kyselyDB from 'services/kysely.js'

import BookRepository from 'examples/repositories/books.js'
import TagRepository from 'examples/repositories/tags.js'

export default class CreateBookService {
  constructor(
    private bookRepository: BookRepository,
    private tagRepository: TagRepository
  ) {}

  async create() {
    const transaction = await kyselyDB.startTransaction()
    this.tagRepository.withTransaction(transaction)
    this.bookRepository.withTransaction(transaction)

    this.tagRepository.create({
      name: 'Hello',
    })

    this.bookRepository.create({
      name: 'Test',
      author: 'test',
    })

    setTimeout(async () => {
      await kyselyDB.commitTransaction(transaction)
    }, 5000)
  }
}
