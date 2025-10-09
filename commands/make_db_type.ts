import { BaseCommand } from '@adonisjs/core/ace'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default class MakeDbType extends BaseCommand {
  static commandName = 'make:db-type'
  static description = 'Generate Kysely DB types using kysely-codegen'

  async run() {
    try {
      this.logger.info('Generating database types with kysely-codegen...')
      // TODO: implement in package config, the value passed in parameter or create kysely-codegenrc.json and just keep this as an alias
      const { stdout, stderr } = await execAsync('npx kysely-codegen --out-file=types/db.ts')

      if (stdout) this.logger.info(stdout)
      if (stderr) this.logger.error(stderr)

      this.logger.success('Database types generated successfully!')
    } catch (error) {
      this.logger.error('Failed to generate database types')
      this.logger.fatal(error)
    }
  }
}
