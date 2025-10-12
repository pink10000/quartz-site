import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

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
    baseUrl: "pink10000.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
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
        priority: ["frontmatter", "filesystem"],
      }),
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
        
          // Calculus
          "\\del": "\\partial",
        
          // Misc
          "\\notexists": "\\nexists",
          "\\vvf": "\\textbf{f}",
          "\\rrarrow": "\\rightrightarrows"
        },
      }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage({
        sort: (a, b) => {
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
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config
