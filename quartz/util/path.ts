// Re-export shared path utilities from @quartz-community/utils
export {
  isFilePath,
  isFullSlug,
  isSimpleSlug,
  isRelativeURL,
  isAbsoluteURL,
  getFullSlug,
  simplifySlug,
  joinSegments,
  endsWith,
  trimSuffix,
  stripSlashes,
  getFileExtension,
  isFolderPath,
  getAllSegmentPrefixes,
  pathToRoot,
  resolveRelative,
  splitAnchor,
  transformInternalLink,
  transformLink,
  normalizeHastElement,
} from "@quartz-community/utils"

export const slugTag = (tag: string): string => {
  return tag
    .split("/")
    .map((tagSegment) => _sluggifyV4(tagSegment))
    .join("/")
}

export type {
  FilePath,
  FullSlug,
  SimpleSlug,
  RelativeURL,
  TransformOptions,
} from "@quartz-community/utils"

import type { FilePath, FullSlug } from "@quartz-community/utils"
import { stripSlashes, getFileExtension, endsWith } from "@quartz-community/utils"

/**
 * v4-compatible slugifyFilePath: preserves case (no .toLowerCase()) and
 * does NOT apply the v5 "folder-note" convention (folder/folder.md → folder/index).
 * This keeps output URLs identical to what the v4 site produced.
 */
function _sluggifyV4(s: string): string {
  return s
    .split("/")
    .map((segment) =>
      segment
        .replace(/\s/g, "-")
        .replace(/&/g, "-and-")
        .replace(/%/g, "-percent")
        .replace(/\?/g, "")
        .replace(/#/g, ""),
    )
    .join("/")
    .replace(/\/$/, "")
}

export function slugifyFilePath(fp: FilePath, excludeExt?: boolean): FullSlug {
  fp = stripSlashes(fp) as FilePath
  const ext = getFileExtension(fp)
  const withoutFileExt = fp.replace(new RegExp((ext ?? "") + "$"), "")
  const finalExt = excludeExt || [".md", ".html", undefined].includes(ext) ? "" : ext

  let slug = _sluggifyV4(withoutFileExt)

  // treat _index as index (Hugo compatibility)
  if (endsWith(slug, "_index")) {
    slug = slug.replace(/_index$/, "index")
  }

  // NOTE: v5 adds a "folder-note" rewrite here (folder/folder.md → folder/index).
  // We intentionally skip it to preserve v4 URL structure.

  return (slug + (finalExt ?? "")) as FullSlug
}

// --- v5-specific exports below ---

export const QUARTZ = "quartz"

// from micromorph/src/utils.ts
// https://github.com/natemoo-re/micromorph/blob/main/src/utils.ts#L5
const _rebaseHtmlElement = (el: Element, attr: string, newBase: string | URL) => {
  const rebased = new URL(el.getAttribute(attr)!, newBase)
  el.setAttribute(attr, rebased.pathname + rebased.hash)
}
export function normalizeRelativeURLs(el: Element | Document, destination: string | URL) {
  el.querySelectorAll('[href=""], [href^="./"], [href^="../"]').forEach((item) => {
    _rebaseHtmlElement(item, "href", destination)
  })
  el.querySelectorAll('[src=""], [src^="./"], [src^="../"]').forEach((item) => {
    _rebaseHtmlElement(item, "src", destination)
  })
}
