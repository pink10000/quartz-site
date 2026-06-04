import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes/dispatcher"
import { componentRegistry } from "./quartz/components/registry"
import PaneToggle from "./quartz/components/PaneToggle"
import Darkmode from "./quartz/components/Darkmode"
import { Flex, DesktopOnly, MobileOnly, Spacer } from "./quartz/components"
import { plugins } from "./.quartz/plugins"
import { customOgImage } from "./quartz/plugins/emitters/customOgImage"

// Override community og-image emitter options with custom imageStructure
plugins["og-image"].CustomOgImages({
  imageStructure: customOgImage,
})

const config = await loadQuartzConfig()
const layout = await loadQuartzLayout()

if (process.env.SKIP_OG_IMAGE) {
  config.plugins.emitters = config.plugins.emitters.filter(e => e.name !== "CustomOgImages")
}

const getComponent = (name: string, options?: any) => {
  const reg = componentRegistry.get(name)
  if (!reg) throw new Error(`Component not found: ${name}`)
  if (typeof reg.component === "function" && !("displayName" in reg.component)) {
    return componentRegistry.instantiate(reg.component as any, options)
  }
  return reg.component
}

// Extract registered components
const pageTitle = getComponent("page-title")
const search = getComponent("search")
const darkmode = getComponent("darkmode")
const explorer = getComponent("explorer")
const toc = getComponent("table-of-contents")
const graph = getComponent("graph")
const backlinks = getComponent("backlinks")
const tagList = getComponent("tag-list")
const breadcrumbs = getComponent("breadcrumbs")
const articleTitle = getComponent("article-title")
const contentMeta = getComponent("content-meta")

// Reusable header component setup
const headerLayout = [
  PaneToggle(),
  Darkmode(),
  pageTitle,
  Flex({
    gap: "0.5rem",
    grow: true,
    components: [
      {
        Component: search,
        grow: true,
        justify: "end",
      },
    ],
  }),
]

// 1. Mutate defaults (Content/Notes pages)
layout.defaults.header = headerLayout

layout.defaults.beforeBody = [
  breadcrumbs,
  articleTitle,
  contentMeta,
  tagList,
]

// The left sidebar on content pages should only contain Explorer
layout.defaults.left = [explorer]

// The right sidebar should contain TableOfContents (DesktopOnly), Graph, and Backlinks in that order
layout.defaults.right = [
  DesktopOnly(toc),
  graph,
  backlinks,
]

// 2. Mutate list pages (folder and tag list pages) and other page types
for (const pageType of Object.keys(layout.byPageType)) {
  layout.byPageType[pageType] = {
    ...layout.byPageType[pageType],
    header: headerLayout,
  }
}

layout.byPageType["content"] = {
  ...layout.byPageType["content"],
  beforeBody: [
    breadcrumbs,
    articleTitle,
    contentMeta,
    tagList,
  ],
  left: [explorer],
  right: [
    DesktopOnly(toc),
    graph,
    backlinks,
  ],
}

for (const pageType of ["folder", "tag"]) {
  layout.byPageType[pageType] = {
    ...layout.byPageType[pageType],
    beforeBody: [
      breadcrumbs,
      articleTitle,
      contentMeta,
    ],
    left: [explorer],
    right: [],
  }
}

// Re-instantiate PageTypeDispatcher with our modified defaults and byPageType
const dispatcherIndex = config.plugins.emitters.findIndex(e => e.name === "PageTypeDispatcher")
if (dispatcherIndex !== -1) {
  config.plugins.emitters[dispatcherIndex] = PageTypeDispatcher({
    defaults: layout.defaults,
    byPageType: layout.byPageType,
  })
}

export default config
export { layout }
