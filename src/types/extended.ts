import { AdonisKyselyDB } from '../kysely_db.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'adonis-kysely': AdonisKyselyDB
  }
}

declare module 'adonis-kysely/types/db' {
  export interface DB {}
}
