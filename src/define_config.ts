import { InvalidArgumentsException } from '@poppinss/utils'
import type { AdonisKyselyConfig } from './types/main.js'

export function defineConfig<T extends AdonisKyselyConfig>(config: T): T {
  if (!config) {
    throw new InvalidArgumentsException('Invalid config. It must be a valid object')
  }

  if (!config.dialect) {
    throw new InvalidArgumentsException('Invalid config. Missing property "dialect" inside it')
  }

  return config
}
