import fs from 'node:fs/promises'
import path from 'node:path'
import { Kysely } from 'kysely'
import type { AdonisKyselyDB } from './kysely_db.js'
import type { DB } from 'adonis-kysely/types/db'
import type { ApplicationService } from '@adonisjs/core/types'

type SeederFunction = (db: Kysely<DB>) => Promise<void>

export class KyselySeeder {
  private db: AdonisKyselyDB
  private app: ApplicationService

  constructor(db: AdonisKyselyDB, app: ApplicationService) {
    this.db = db
    this.app = app
  }

  /**
   * Loads and executes all seeders in a folder
   * @param subfolder - Subfolder (e.g. 'main', 'test')
   * @param priorityOrder - Seeders to execute first (in order)
   * @param excludePatterns - Patterns to exclude from execution
   */
  async runSeeders(
    subfolder: string,
    priorityOrder: string[] = [],
    excludePatterns: string[] = []
  ): Promise<void> {
    const seederDir = path.join(this.app.seedersPath(), subfolder)

    try {
      const files = await fs.readdir(seederDir)
      let seederFiles = files
        .filter((file) => file.endsWith('_seeder.ts') || file.endsWith('_seeder.js'))
        .sort()

      // Filter out excluded seeders
      if (excludePatterns.length > 0) {
        seederFiles = seederFiles.filter(
          (file) =>
            !excludePatterns.some((pattern) => file.includes(pattern) || file.startsWith(pattern))
        )
      }

      if (seederFiles.length === 0) {
        console.warn(`📁 No seeders found in: ${seederDir}`)
        return
      }

      const orderedFiles = this.orderFilesByPriority(seederFiles, priorityOrder)

      console.log(
        `📦 Running ${subfolder} seeders:`,
        orderedFiles.map((f) => f.replace(/\.[jt]s$/, ''))
      )

      for (const file of orderedFiles) {
        const seederPath = path.join(seederDir, file)

        try {
          // Import with file:// for Windows/Linux compatibility
          const fileUrl = `file://${seederPath.replace(/\\/g, '/')}`
          const seederModule = await import(fileUrl)
          const seederFunction: SeederFunction = seederModule.default

          if (typeof seederFunction === 'function') {
            await seederFunction(this.db.getConnexion())

            console.log(`  ✅ ${file}`)
          } else {
            console.warn(`  ⚠️  ${file} - No default export function`)
          }
        } catch (error) {
          console.error(`  ❌ ${file} - Error:`, error)
          console.log(
            `  ❌ ${file} - Error:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`📁 Seeder directory not found: ${seederDir}`)
        return
      }
      console.log(`❌ Error reading seeders in ${seederDir}:`, error)
    }
  }

  /**
   * Order files by putting priorities first
   * then the rest in alphabetical order
   */
  private orderFilesByPriority(files: string[], priorityOrder: string[]): string[] {
    const priorityFiles: string[] = []
    const otherFiles: string[] = []

    for (const file of files) {
      const isPriority = priorityOrder.some(
        (pattern) => file.includes(pattern) || file.startsWith(pattern)
      )

      if (isPriority) {
        priorityFiles.push(file)
      } else {
        otherFiles.push(file)
      }
    }

    const orderedPriorityFiles = priorityOrder
      .map((pattern) =>
        priorityFiles.find((file) => file.includes(pattern) || file.startsWith(pattern))
      )
      .filter(Boolean) as string[]

    // Combine: priorities + others (sorted)
    return [...orderedPriorityFiles, ...otherFiles.sort()]
  }
}
