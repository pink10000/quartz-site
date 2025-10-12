// This code is from
// https://github.com/aarnphm/aarnphm.github.io/blob/main/quartz/plugins/transformers/tikz.ts
// Many thanks to Aaron Pham.

import { Code, Root as MdRoot } from "mdast"
import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { load, tex, dvi2svg } from "node-tikzjax"
import { h, s } from "hastscript"
import { Element, Properties } from "hast"
import { svgOptions } from "../../components/svg"
import { toHtml } from "hast-util-to-html"
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic"

async function tex2svg(input: string, showConsole: boolean) {
  await load()
  const dvi = await tex(input, {
    texPackages: { pgfplots: "", amsmath: "intlimits" },
    tikzLibraries: "arrows.meta,calc,positioning",
    addToPreamble: "% comment",
    showConsole,
  })
  const svg = await dvi2svg(dvi)
  return svg
}

interface TikzNode {
  index: number
  value: string
  parent: MdRoot
  base64?: string
}

function parseStyle(meta: string | null | undefined): string {
  if (!meta) return ""
  const styleMatch = meta.match(/style\s*=\s*["']([^"']+)["']/)
  return styleMatch ? styleMatch[1] : ""
}

const docs = (node: Code): string => JSON.stringify(node.value)

// mainly for reparse from HTML back to MD
function makeTikzGraph(node: Code, svg: string, style?: string): Element {
  const mathMl = h(
    "span.tikz-mathml",
    h(
      "math",
      { xmlns: "http://www.w3.org/1998/Math/MathML" },
      h(
        "semantics",
        h("annotation", { encoding: "application/x-tex" }, { type: "text", value: docs(node) }),
      ),
    ),
  )

  const sourceCodeCopy = h(
    "figcaption",
    h("em", [{ type: "text", value: "source code" }]),
    h(
      "button.source-code-button",
      {
        ariaLabel: "copy source code for this tikz graph",
        title: "copy source code for this tikz graph",
      },
      s(
        "svg.source-icon",
        {
          ...svgOptions,
          width: 12,
          height: 16,
          viewbox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokewidth: 2,
          strokelinecap: "round",
          strokelinejoin: "round",
        },
        s("path", { d: "M16 3L22 9L22 21C22 21.5304 21.7893 22.0391 21.4142 22.4142C21.0391 22.7893 20.5304 23 20 23L4 23C3.46957 23 2.96086 22.7893 2.58579 22.4142C2.21071 22.0391 2 21.5304 2 21L2 5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3L16 3ZM16 3L16 9L22 9" }),
      ),
      s(
        "svg.check-icon",
        {
          ...svgOptions,
          width: 12,
          height: 16,
          viewbox: "0 0 16 16",
          fill: "rgb(63, 185, 80)",
          stroke: "none",
        },
        s("path", { "fill-rule": "evenodd", d: "M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" }),
      ),
    ),
  )

  const properties: Properties = { "data-remark-tikz": true, style: "" }
  if (style) properties.style = style

  return h(
    "figure.tikz",
    properties,
    mathMl,
    fromHtmlIsomorphic(svg, { fragment: true }),
    sourceCodeCopy,
  )
}

interface Options {
  showConsole: boolean
}

const defaultOpts: Options = {
  showConsole: false,
}

export const TikzJax: QuartzTransformerPlugin<Options> = (opts?: Options) => {
  const o = { ...defaultOpts, ...opts }
  return {
    name: "TikzJax",
    // TODO: maybe we should render client-side instead of server-side? (build-time would increase).
    markdownPlugins({ argv }) {
      return [
        () => async (tree) => {
          const nodes: TikzNode[] = []
          visit(tree, "code", (node: Code, index, parent) => {
            let { lang, meta, value } = node
            if (lang === "tikz") {
              const base64Match = meta?.match(/alt\s*=\s*"data:image\/svg\+xml;base64,([^"]+)"/)
              let base64String = undefined
              if (base64Match) {
                base64String = Buffer.from(base64Match[1], "base64").toString()
              }
              nodes.push({
                index: index as number,
                parent: parent as MdRoot,
                value,
                base64: base64String,
              })
            }
          })

          for (let i = 0; i < nodes.length; i++) {
            const { index, parent, value, base64 } = nodes[i]
            let svg
            if (base64 !== undefined) svg = base64
            else svg = await tex2svg(value, o.showConsole)
            const node = parent.children[index] as Code

            parent.children.splice(index, 1, {
              type: "html",
              value: toHtml(makeTikzGraph(node, svg, parseStyle(node?.meta)), {
                allowDangerousHtml: true,
              }),
            })
          }
        },
      ]
    },
    externalResources() {
      return {
        css: [
          {
            content: "https://cdn.jsdelivr.net/npm/node-tikzjax@latest/css/fonts.css",
          },
        ],
      }
    },
  }
}
