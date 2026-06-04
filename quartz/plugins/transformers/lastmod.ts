import fs from "fs"
import { Repository } from "@napi-rs/simple-git"
import { QuartzTransformerPlugin } from "../types"
import path from "path"
import { styleText } from "util"
import { spawnSync } from "child_process"

export interface Options {
  priority: ("frontmatter" | "git" | "filesystem")[]
}

const defaultOptions: Options = {
  priority: ["frontmatter", "git", "filesystem"],
}

// YYYY-MM-DD
const iso8601DateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

function coerceDate(fp: string, d: any): Date {
  // check ISO8601 date-only format
  // we treat this one as local midnight as the normal
  // js date ctor treats YYYY-MM-DD as UTC midnight
  if (typeof d === "string" && iso8601DateOnlyRegex.test(d)) {
    d = `${d}T00:00:00`
  }

  const dt = new Date(d)
  const invalidDate = isNaN(dt.getTime()) || dt.getTime() === 0
  if (invalidDate && d !== undefined) {
    console.log(
      styleText(
        "yellow",
        `\nWarning: found invalid date "${d}" in \`${fp}\`. Supported formats: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format`,
      ),
    )
  }

  return invalidDate ? new Date() : dt
}

type MaybeDate = undefined | string | number
export const CreatedModifiedDate: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "CreatedModifiedDate",
    markdownPlugins(ctx) {
      return [
        () => {
          const repoCache = new Map<string, Repository>()
          const creationDateCache = new Map<string, Map<string, number>>()
          const loadedWorkdirs = new Set<string>()

          return async (_tree, file) => {
            let created: MaybeDate = undefined
            let modified: MaybeDate = undefined
            let published: MaybeDate = undefined

            const fp = file.data.relativePath!
            const fullFp = file.data.filePath!
            for (const source of opts.priority) {
              if (source === "filesystem") {
                const st = await fs.promises.stat(fullFp)
                created ||= st.birthtimeMs
                modified ||= st.mtimeMs
              } else if (source === "frontmatter" && file.data.frontmatter) {
                created ||= file.data.frontmatter.created as MaybeDate
                modified ||= file.data.frontmatter.modified as MaybeDate
                published ||= file.data.frontmatter.published as MaybeDate
              } else if (source === "git") {
                const dir = path.dirname(fullFp)
                let currentRepo = repoCache.get(dir)
                if (!currentRepo) {
                  try {
                    currentRepo = Repository.discover(dir)
                    repoCache.set(dir, currentRepo)
                  } catch {
                    // ignore
                  }
                }

                if (currentRepo) {
                  try {
                    const workdir = currentRepo.workdir() ?? ctx.argv.directory
                    const relativePath = path.relative(workdir, fullFp)

                    if (!loadedWorkdirs.has(workdir)) {
                      const repoCreationCache = new Map<string, number>()
                      try {
                        const result = spawnSync(
                          "git",
                          ["log", "--diff-filter=A", "--name-only", "--format=COMMIT:%at", "-z"],
                          { encoding: "utf-8", cwd: workdir },
                        )
                        if (result.status === 0) {
                          const pieces = result.stdout.split("\0")
                          let currentTimestamp: number | undefined
                          for (const piece of pieces) {
                            if (piece.startsWith("COMMIT:")) {
                              currentTimestamp = parseInt(piece.slice(7))
                            } else {
                              const file = piece.trim()
                              if (file && currentTimestamp) {
                                const timestampMs = currentTimestamp * 1000
                                const existing = repoCreationCache.get(file)
                                if (!existing || timestampMs < existing) {
                                  repoCreationCache.set(file, timestampMs)
                                }
                              }
                            }
                          }
                        }
                      } catch {
                        // ignore
                      }
                      creationDateCache.set(workdir, repoCreationCache)
                      loadedWorkdirs.add(workdir)
                    }

                    created ||= creationDateCache.get(workdir)?.get(relativePath)
                    modified ||= await currentRepo.getFileLatestModifiedDateAsync(relativePath)
                  } catch {
                    console.log(
                      styleText(
                        "yellow",
                        `\nWarning: ${file.data.filePath!} isn't yet tracked by git, dates will be inaccurate`,
                      ),
                    )
                  }
                }
              }
            }

            file.data.dates = {
              created: coerceDate(fp, created),
              modified: coerceDate(fp, modified),
              published: coerceDate(fp, published),
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    dates: {
      created: Date
      modified: Date
      published: Date
    }
  }
}
