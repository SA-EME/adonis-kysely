import { AdonisKyselyDB } from '#src/kysely_db'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'adonis-kysely': AdonisKyselyDB
  }
}

declare module 'adonis-kysely/types/db' {
  export interface DB {}
}
