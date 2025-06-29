import BookRepository from './repositories/books.js'
import TagRepository from './repositories/tags.js'
import CreateBookService from './services/create.js'

// need to verify, if the transaction is not overide by the other service
const bookService = new CreateBookService(new BookRepository(), new TagRepository())
bookService.create()
bookService.create()
