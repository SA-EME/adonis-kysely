import type ConfigureCommand from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

export async function configure(command: ConfigureCommand) {
  let dialect = command.parsedFlags.db
  let shouldInstallPackages = command.parsedFlags.install

  const codemods = await command.createCodemods()

  const db = await command.prompt.choice(
    'What database dialect you want to use with Adonis Kysely?',
    [
      { name: 'postgres', message: 'Postgres' },
      { name: 'mysql', message: 'MySQL' },
      { name: 'sqlite', message: 'SQLite' },
    ],
    {
      name: 'db',
      default: dialect || 'postgres',
    }
  )

  let dbConfig: {
    db_user?: string
    db_password?: string
    db_host?: string
    db_port?: number
    db_name?: string
    db_path?: string
  } = {}
  shouldInstallPackages = await command.prompt.confirm(
    'Do you want to install the required packages for Adonis Kysely ?',
    {
      default: true,
    }
  )

  const neededPackages = [
    {
      name: 'kysely',
      isDevDependency: false,
    },
    {
      name: 'kysely-codegen',
      isDevDependency: true,
    },
  ]

  if (db === 'sqlite') {
    dbConfig.db_path = await command.prompt.ask('What is the path to your SQLite database file?', {
      name: 'db_path',
      default: 'database.sqlite',
    })

    neededPackages.push(
      {
        name: 'better-sqlite3@11.9.1',
        isDevDependency: false,
      }
      // {
      //   name: '@types/better-sqlite3',
      //   isDevDependency: true,
      // }
    )

    await codemods.defineEnvVariables({
      DB_PATH: dbConfig.db_path ?? '',
    })

    await codemods.defineEnvValidations({
      variables: {
        DB_PATH: 'Env.schema.string()',
      },
    })
  } else {
    dbConfig.db_user = await command.prompt.ask('What is the user of your database?', {
      name: 'db_user',
      default: db === 'postgres' ? 'postgres' : 'root',
    })
    dbConfig.db_password = await command.prompt.ask('What is the password of your database?', {
      name: 'db_password',
      default: db === 'postgres' ? 'postgres' : 'root',
    })
    dbConfig.db_host = await command.prompt.ask('What is the host of your database?', {
      name: 'db_host',
      default: 'localhost',
    })
    dbConfig.db_port = await command.prompt.ask('What is the port of your database?', {
      name: 'db_port',
      default: db === 'postgres' ? '5432' : '3306',
      validate: (value) => {
        const port = Number.parseInt(value, 10)
        return !Number.isNaN(port) && port > 0 && port < 65536
          ? true
          : 'Please enter a valid port number between 1 and 65535'
      },
    })
    dbConfig.db_name = await command.prompt.ask('What is the name of your database?', {
      name: 'db_name',
      default: 'database',
    })

    neededPackages.push({
      name: db === 'postgres' ? 'pg' : 'mysql2',
      isDevDependency: false,
    })

    await codemods.defineEnvVariables({
      DB_HOST: dbConfig.db_host ?? '',
      DB_PORT: dbConfig.db_port ?? '',
      DB_USER: dbConfig.db_user ?? '',
      DB_PASSWORD: dbConfig.db_password ?? '',
      DB_DATABASE: dbConfig.db_name ?? '',
    })

    await codemods.defineEnvValidations({
      variables: {
        DB_HOST: 'Env.schema.string()',
        DB_PORT: 'Env.schema.number()',
        DB_USER: 'Env.schema.string()',
        DB_PASSWORD: 'Env.schema.string()',
        DB_DATABASE: 'Env.schema.string()',
      },
      leadingComment: 'Variables for configuring the database connection',
    })

    // if (db === 'postgres') {
    //   neededPackages.push({
    //     name: '@types/pg',
    //     isDevDependency: true,
    //   })
    // }
  }

  if (shouldInstallPackages) {
    await codemods.installPackages(neededPackages)
  }

  await codemods.makeUsingStub(stubsRoot, `config/kysely_${db}.stub`, {})
  // TODO, find a way to use rootPath
  await codemods.makeUsingStub(stubsRoot, 'types/db.stub', {})

  const DATABASE_URL =
    db === 'sqlite'
      ? `${db}://${dbConfig.db_path}`
      : `${db}://${dbConfig.db_user}:${dbConfig.db_password}@${dbConfig.db_host}:${dbConfig.db_port}/${dbConfig.db_name}`

  await codemods.defineEnvVariables({
    DATABASE_URL,
  })

  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('adonis-kysely/commands').addProvider('adonis-kysely/kysely_provider')
  })
}
