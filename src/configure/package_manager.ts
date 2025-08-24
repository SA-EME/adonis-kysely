import type ConfigureCommand from '@adonisjs/core/commands/configure'
import type { SupportedDialect, PackageDependency } from '../types/configure.js'

const BASE_PACKAGES: PackageDependency[] = [
  {
    name: 'kysely',
    isDevDependency: false,
  },
  {
    name: 'kysely-codegen',
    isDevDependency: true,
  },
]

const DIALECT_PACKAGES: Record<SupportedDialect, PackageDependency[]> = {
  postgres: [
    {
      name: 'pg',
      isDevDependency: false,
    },
    // { typings have problems with adonisjs installation package
    //   name: '@types/pg',
    //   isDevDependency: true,
    // },
  ],
  mysql: [
    {
      name: 'mysql2',
      isDevDependency: false,
    },
  ],
  sqlite: [
    {
      name: 'better-sqlite3@11.9.1', // latest version don't seem to work with AdonisJS
      isDevDependency: false,
    },
    // { typings have problems with adonisjs installation package
    //   name: '@types/better-sqlite3',
    //   isDevDependency: true,
    // },
  ],
}

export function getRequiredPackages(dialect: SupportedDialect): PackageDependency[] {
  return [...BASE_PACKAGES, ...DIALECT_PACKAGES[dialect]]
}

export async function confirmPackageInstallation(command: ConfigureCommand): Promise<boolean> {
  return await command.prompt.confirm(
    'Do you want to install the required packages for Adonis Kysely ?',
    {
      default: true,
    }
  )
}

export async function installPackages(
  command: ConfigureCommand,
  packages: PackageDependency[]
): Promise<void> {
  await command.createCodemods().then((codemods) => codemods.installPackages(packages))
}
