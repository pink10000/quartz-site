import { QuartzEmitterPlugin } from "../types"
import path from "path"
import fs from "fs"
import { globby } from "globby"
import { joinSegments, FilePath } from "../../util/path"

export const DesmosAssets: QuartzEmitterPlugin = () => {
  return {
    name: "DesmosAssets",
    async *emit({ argv }) {
      // The local folder where desmos-obsidian saves SVGs (usually hidden .desmos)
      const desmosDir = path.join(argv.directory, "notes", ".desmos")
      
      // Check if source exists
      try {
        await fs.promises.access(desmosDir)
      } catch {
        return // No desmos folder
      }

      const files = await globby("*.svg", {
        cwd: desmosDir,
      })

      for (const file of files) {
        const src = path.join(desmosDir, file)
        // We output to 'notes/desmos' (without dot) because many static hosts 
        // and Quartz's default serve ignore dotfiles/dotfolders.
        const dest = joinSegments(argv.output, "notes", "desmos", file) as FilePath
        
        const dir = path.dirname(dest)
        await fs.promises.mkdir(dir, { recursive: true })
        await fs.promises.copyFile(src, dest)
        yield dest
      }
    },
  }
}
