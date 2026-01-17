import { customOgImage } from "../plugins/emitters/customOgImage"
// import config from "../../quartz.config" 
import { getSatoriFonts } from "../util/og"
import satori from "satori"
import sharp from "sharp"
import { loadEmoji, getIconCode } from "../util/emoji"

// Mock Config to avoid importing quartz.config.ts which imports components that import scss
const config = {
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
        }
      }
    }
  }
} as any

// Mock Data
const slug = process.argv[2] ?? "computer_security/index"
const providedTitle = process.argv[3]
const derivedTitle = slug.split("/").pop()?.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "Test Title"
const title = providedTitle ?? derivedTitle

console.log(`Generating OG image for slug: ${slug}, title: ${title}`)

const fileData = {
  slug,
  frontmatter: {
    title: title,
    socialDescription: "Test Description"
  }
}

const description = "Test Description"

async function generate() {
  // Load fonts
  const headerFont = config.configuration.theme.typography.header
  const bodyFont = config.configuration.theme.typography.body
  const fonts = await getSatoriFonts(headerFont, bodyFont)

  // Options
  const width = 1200
  const height = 630

  // Create Element
  // We need to match the signature of SocialImageOptions["imageStructure"]
  const element = customOgImage({
    cfg: config.configuration,
    userOpts: { 
      width, 
      height, 
      colorScheme: "lightMode", 
      excludeRoot: false,
    },
    title,
    description,
    fileData: fileData as any, // Cast because we are mocking a partial QuartzPluginData
    fonts,
    iconBase64: undefined 
  })

  // Satori
  const svg = await satori(element, {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (languageCode: string, segment: string) => {
      if (languageCode === "emoji") {
        return await loadEmoji(getIconCode(segment))
      }
      return languageCode
    },
  })

  // Sharp
  const outputPath = "og-debug.png"
  await sharp(Buffer.from(svg)).png().toFile(outputPath)
  console.log(`Generated ${outputPath}`)
}

generate().catch(console.error)
