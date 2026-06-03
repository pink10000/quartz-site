import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { customOgImage } from "./quartz/plugins/emitters/customOgImage"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "kyle's notes",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "pink10000.github.io/notes",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Space Grotesk",
        body: "Source Sans Pro",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#ed74c3",
          tertiary: "#5a6ded",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#f2b6de",
          tertiary: "#89bdf4",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.DesmosGraph(),
      Plugin.TikzJax({ showConsole: false }),

      // This plugin needs to be before `Plugin.ObsidianFlavoredMarkdown`. 
      // See https://quartz.jzhao.xyz/features/Mermaid-diagrams 
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ 
        // for some reason the macros only work when this is katex and not mathjax
        renderEngine: "katex", 
        katexOptions: {
          trust: true,
        },
        customMacros: {
          // Sets
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          "\\C": "\\mathbb{C}",
          "\\Q": "\\mathbb{Q}",
          "\\RQ": "\\R\\backslash\\Q", // Note: Assumes \R is defined above or standard
          "\\cA": "\\mathcal{A}",
	        "\\sR": "\\mathscr{R}",

          // // Statistics
          "\\var": "\\text{Var}",
          "\\Binom": "\\text{Binom}",
          "\\bias": "\\text{Bias}",
          "\\pois": "\\text{Pois}",
          "\\Exp": "\\text{Exp}",
          "\\P": "\\mathbb{P}", // From \renewcommand{\P}
          "\\Cov": "\\text{Cov}",
          "\\E": "\\mathbb{E}\\left\[#1\\right\]",
        
          // Linear Algebra
          "\\trace": "\\text{trace}",
        
          // Abstract Algebra
          "\\ker": "\\text{Ker }", // From \renewcommand{\ker} - includes space
          "\\kerphi": "\\text{Ker }\\varphi", // Expanded based on \ker above
          "\\id": "\\text{Id}",
          "\\GL": "\\text{GL}",
          "\\SL": "\\text{SL}",
        
          // Analysis
          "\\Re": "\\text{Re}", // From \renewcommand{\Re}
          "\\Im": "\\text{Im}", // From \renewcommand{\Im}
          "\\diam": "\\text{diam}",
          "\\vepsi": "\\varepsilon",
          "\\ovl": "\\overline{#1}",
          "\\unl": "\\underline{#1}",

          // Topology
          "\\Cl": "\\text{Cl}",

          // xcancel macro
          "\\xcancel": "\\cancel{\\bcancel{#1}}",
        
          // Calculus
          "\\del": "\\partial",
          "\\oiint" :"\\subset\\!\\supset} \\mathllap{\\iint}}",
        
          // Misc
          "\\notexists": "\\nexists",
          "\\vvf": "\\textbf{f}",
          "\\rrarrow": "\\rightrightarrows",
          "\\ceil": "\\left\\lceil #1 \\right\\rceil",
          "\\llbracket": "[\\![", "\\rrbracket": "]\\!]",
          "\\argmax": "\\operatorname*{argmax}",
          "\\argmin": "\\operatorname*{argmin}",

          // Physics
          "\\dimM": "\\mathsf{M}",
          "\\dimL": "\\mathsf{L}",
          "\\dimT": "\\mathsf{T}",
          "\\dimTheta": "\\mathsf{\Theta}",
          "\\dimI": "\\mathsf{I}",
          "\\dimC": "\\mathsf{C}",
          "\\dimN": "\\mathsf{N}",
          "\\dimB": "\\mathsf{B}",
          "\\bzero": "\\mathbf{0}",
          "\\SE": "\\operatorname{SE}",
          "\\SO": "\\operatorname{SO}",

          // Bold Letters
          "\\ba": "\\mathbf{a}",
          "\\bb": "\\mathbf{b}",
          "\\bc": "\\mathbf{c}",
          "\\bd": "\\mathbf{d}",
          "\\be": "\\mathbf{e}",
          "\\bf": "\\mathbf{f}",
          "\\bg": "\\mathbf{g}",
          "\\bh": "\\mathbf{h}",
          "\\bi": "\\mathbf{i}",
          "\\bj": "\\mathbf{j}",
          "\\bk": "\\mathbf{k}",
          "\\bl": "\\mathbf{l}",
          "\\bm": "\\mathbf{m}",
          "\\bn": "\\mathbf{n}",
          "\\bo": "\\mathbf{o}",
          "\\bp": "\\mathbf{p}",
          "\\bq": "\\mathbf{q}",
          "\\br": "\\mathbf{r}",  
          "\\bs": "\\mathbf{s}",
          "\\bt": "\\mathbf{t}",
          "\\bu": "\\mathbf{u}",
          "\\bv": "\\mathbf{v}",
          "\\bw": "\\mathbf{w}",
          "\\bx": "\\mathbf{x}",
          "\\by": "\\mathbf{y}",
          "\\bz": "\\mathbf{z}",
          "\\bA": "\\mathbf{A}",
          "\\bB": "\\mathbf{B}",
          "\\bC": "\\mathbf{C}",
          "\\bD": "\\mathbf{D}",
          "\\bE": "\\mathbf{E}",
          "\\bF": "\\mathbf{F}",
          "\\bG": "\\mathbf{G}",
          "\\bH": "\\mathbf{H}",
          "\\bI": "\\mathbf{I}",
          "\\bJ": "\\mathbf{J}",
          "\\bK": "\\mathbf{K}",
          "\\bL": "\\mathbf{L}",
          "\\bM": "\\mathbf{M}",
          "\\bN": "\\mathbf{N}",
          "\\bO": "\\mathbf{O}",
          "\\bP": "\\mathbf{P}",
          "\\bQ": "\\mathbf{Q}",
          "\\bR": "\\mathbf{R}",
          "\\bS": "\\mathbf{S}",
          "\\bT": "\\mathbf{T}",
          "\\bU": "\\mathbf{U}",
          "\\bV": "\\mathbf{V}",
          "\\bW": "\\mathbf{W}",
          "\\bX": "\\mathbf{X}",
          "\\bY": "\\mathbf{Y}",
          "\\bZ": "\\mathbf{Z}"
        },
      }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.DesmosAssets(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage({
        sort: (a, b) => {
            if (a.dates && b.dates) {
              return b.dates.modified.getTime() - a.dates.modified.getTime()
            }

            const orderA = a.frontmatter?.tags?.find((tag: string) => tag.startsWith("order:"))?.split(":")[1] as number | undefined ?? Infinity;
            const orderB = b.frontmatter?.tags?.find((tag: string) => tag.startsWith("order:"))?.split(":")[1] as number | undefined ?? Infinity;
            
            if (orderA !== orderB) {
              return orderA - orderB; // Ascending numerical sort
            }
 
            // Fallback sort: if order is the same or missing, sort by file path
            const titleA = a.filePath ?? ""; // Use filePath as fallback key
            const titleB = b.filePath ?? "";
            return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
          }
      }),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      ...(!process.env.SKIP_OG_IMAGE
        ? [Plugin.CustomOgImages({ imageStructure: customOgImage })]
        : []),
    ],
  },
}

export default config
