// quartz/plugins/transformers/desmos.ts
import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Code } from "mdast"
import * as fs from "node:fs/promises"
import { existsSync } from "node:fs"
import * as path from "node:path"
import { chromium, Browser } from "playwright"

// --- Desmos Parsing Helpers ---

enum DegreeMode {
    Radians = "radians",
    Degrees = "degrees",
}

enum ColorConstant {
    RED = "#c74440",
    BLUE = "#2d70b3",
    GREEN = "#388c46",
    ORANGE = "#fa7e19",
    PURPLE = "#6042a6",
    BLACK = "#000000",
}

type Color = ColorConstant | string

enum LineStyle {
    SOLID = "solid",
    DASHED = "dashed",
    DOTTED = "dotted",
}

enum PointStyle {
    POINT = "point",
    OPEN = "open",
    CROSS = "cross",
}

interface Equation {
    color?: Color
    style?: LineStyle | PointStyle
    hidden?: boolean
    line?: boolean
    label?: string
    equation: string
    restrictions?: string[]
}

interface GraphSettings {
    width: number
    height: number
    left: number
    right: number
    top: number
    bottom: number
    xAxisLabel?: string
    yAxisLabel?: string
    hideAxisNumbers: boolean
    xAxisLogarithmic: boolean
    yAxisLogarithmic: boolean
    grid: boolean
    degreeMode: DegreeMode
    defaultColor?: Color
}

const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
    width: 600,
    height: 400,
    left: -10,
    right: 10,
    bottom: -7,
    top: 7,
    grid: true,
    degreeMode: DegreeMode.Radians,
    hideAxisNumbers: false,
    xAxisLogarithmic: false,
    yAxisLogarithmic: false,
}

const DEFAULT_GRAPH_WIDTH = 20
const DEFAULT_GRAPH_HEIGHT = 14

function parseStringToEnum<V, T extends { [key: string]: V }>(obj: T, key: string): V | null {
    const objKey = Object.keys(obj).find((k) => k.toUpperCase() === key.toUpperCase())
    return objKey ? (obj[objKey] as unknown as V) : null
}

function parseColor(value: string): Color | null {
    if (value.startsWith("#") && /^[0-9a-zA-Z]+$/.test(value.slice(1))) {
        return value as Color
    }
    return parseStringToEnum(ColorConstant, value)
}

function simpleEvaluate(expr: string): number {
    if (!expr) return 0
    const clean = expr.toLowerCase().trim()
    if (clean === "pi") return Math.PI
    if (clean === "-pi") return -Math.PI
    const num = Number(clean)
    return isNaN(num) ? 0 : num
}

function adjustBounds(settings: Partial<GraphSettings>) {
    if (settings.left !== undefined && settings.right === undefined && settings.left >= (DEFAULT_GRAPH_SETTINGS.right)) {
        settings.right = settings.left + DEFAULT_GRAPH_WIDTH
    }
    if (settings.left === undefined && settings.right !== undefined && settings.right <= (DEFAULT_GRAPH_SETTINGS.left)) {
        settings.left = settings.right - DEFAULT_GRAPH_WIDTH
    }
    if (settings.bottom !== undefined && settings.top === undefined && settings.bottom >= (DEFAULT_GRAPH_SETTINGS.top)) {
        settings.top = settings.bottom + DEFAULT_GRAPH_HEIGHT
    }
    if (settings.bottom === undefined && settings.top !== undefined && settings.top <= (DEFAULT_GRAPH_SETTINGS.bottom)) {
        settings.bottom = settings.top - DEFAULT_GRAPH_HEIGHT
    }
}

function parseSettings(settingsStr: string): Partial<GraphSettings> {
    const settings: any = {}
    settingsStr.split(/[;\n]/g).forEach(s => {
        const trimmed = s.trim()
        if (trimmed === "") return
        
        const parts = trimmed.split("=")
        const key = parts[0].trim()
        const val = parts.length > 1 ? parts[1].trim() : undefined
        
        switch (key) {
            case "hideAxisNumbers":
            case "xAxisLogarithmic":
            case "yAxisLogarithmic":
            case "grid":
                // If no value is provided, default to true
                if (!val) {
                    settings[key] = true
                } else {
                    settings[key] = val.toLowerCase() === "true"
                }
                break
            case "xAxisLabel":
            case "yAxisLabel":
                if (val !== undefined) settings[key] = val
                break
            case "top":
            case "bottom":
            case "left":
            case "right":
            case "width":
            case "height":
                if (val !== undefined) settings[key] = simpleEvaluate(val)
                break
            case "degreeMode":
                if (val !== undefined) {
                    const mode = parseStringToEnum(DegreeMode, val)
                    if (mode) settings[key] = mode
                }
                break
            case "defaultColor":
                if (val !== undefined) {
                    const color = parseColor(val)
                    if (color) settings[key] = color
                }
                break
        }
    })
    return settings
}

/// Reimplementation of desmos equation parser
/// From:
/// https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/graph/parser.ts#L144-L251 
function parseEquation(eq: string): Equation {
    const segments = eq.split("|").map(s => s.trim()).filter(s => s)
    const equation: Equation = { equation: segments.shift() || "" }

    segments.forEach(seg => {
        const upper = seg.toUpperCase()
        if (upper === "HIDDEN") { equation.hidden = true; return }
        if (upper === "NOLINE") { equation.line = false; return }

        const style = (parseStringToEnum(LineStyle, upper) as LineStyle | null) ?? (parseStringToEnum(PointStyle, upper) as PointStyle | null)
        if (style) { equation.style = style; return }
        
        const color = parseColor(seg)
        if (color) { equation.color = color; return }

        if (upper.startsWith("LABEL:")) {
            equation.label = seg.split(":").slice(1).join(":").trim()
            return
        }
        if (upper === "LABEL") { equation.label = ""; return }

        if (!equation.restrictions) equation.restrictions = []
        equation.restrictions.push(seg)
    })

    return equation
}

// Global browser instance to reuse across all graphs
let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
    if (!browserInstance) {
        const chromiumPath = "/usr/bin/chromium"
        const executablePath = existsSync(chromiumPath) ? chromiumPath : undefined
        browserInstance = await chromium.launch({ 
            headless: true, 
            executablePath 
        })
    }
    return browserInstance!
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close()
        browserInstance = null
    }
}

async function generateDesmosSVG(
    equations: Equation[],
    settings: Partial<GraphSettings>
): Promise<string> {
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        // Merge settings with defaults
        const fullSettings = { ...DEFAULT_GRAPH_SETTINGS, ...settings }

        // Build expressions array for Desmos
        const expressions = equations.map((eq, idx) => {
            const expr: any = {
                id: `expr-${idx}`,
                latex: eq.equation,
            }
            
            if (eq.color) expr.color = eq.color
            else if (fullSettings.defaultColor) expr.color = fullSettings.defaultColor
            
            if (eq.hidden) expr.hidden = true
            if (eq.line === false) expr.lines = false
            
            // Handle labels - only add if label is defined and not empty
            if (eq.label !== undefined && eq.label !== "") {
                expr.label = eq.label
                expr.showLabel = true
            }
            
            if (eq.style) {
                if (eq.style === LineStyle.DASHED) expr.lineStyle = "DASHED"
                else if (eq.style === LineStyle.DOTTED) expr.lineStyle = "DOTTED"
                else if (eq.style === PointStyle.OPEN) expr.pointStyle = "OPEN"
                else if (eq.style === PointStyle.CROSS) expr.pointStyle = "CROSS"
            }
            
            return expr
        })

        // Create HTML page with Desmos API
        const html = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
    <style>
        body { margin: 0; padding: 0; }
        #calculator { width: ${fullSettings.width}px; height: ${fullSettings.height}px; }
    </style>
</head>
<body>
    <div id="calculator"></div>
    <script>
        window.calculator = Desmos.GraphingCalculator(document.getElementById('calculator'), {
            expressions: false,
            settingsMenu: false,
            zoomButtons: false,
            expressionsTopbar: false,
            border: false,
            lockViewport: true
        });

        // Set graph bounds and settings
        window.calculator.setMathBounds({
            left: ${fullSettings.left},
            right: ${fullSettings.right},
            bottom: ${fullSettings.bottom},
            top: ${fullSettings.top}
        });

        window.calculator.updateSettings({
            degreeMode: ${fullSettings.degreeMode === DegreeMode.Degrees},
            showGrid: ${fullSettings.grid},
            showXAxis: ${!fullSettings.hideAxisNumbers},
            showYAxis: ${!fullSettings.hideAxisNumbers},
            xAxisNumbers: ${!fullSettings.hideAxisNumbers},
            yAxisNumbers: ${!fullSettings.hideAxisNumbers},
            polarMode: false
        });

        // Add equations
        const expressions = ${JSON.stringify(expressions)};
        expressions.forEach(expr => window.calculator.setExpression(expr));

        // Signal ready
        window.desmosReady = true;
    </script>
</body>
</html>
        `

        await page.setContent(html)
        
        // Wait for Desmos to be ready
        await page.waitForFunction(() => (window as any).desmosReady === true, { timeout: 10000 })
        
        // Get the SVG data using asyncScreenshot
        const svgData: string | undefined = await page.evaluate(async ({ width, height }) => {
            const calc = (window as any).calculator
            if (!calc) return undefined
            return new Promise((resolve) => {
                calc.asyncScreenshot({
                    mode: 'preserveX',  // Changed from 'stretch' to preserve aspect ratio
                    width: width,
                    height: height,
                    targetPixelRatio: 1,
                    format: 'svg',
                    showLabels: true  // Explicitly enable labels
                }, (data: string) => resolve(data))
            })
        }, { width: fullSettings.width, height: fullSettings.height })

        if (!svgData) {
            throw new Error("Failed to capture Desmos screenshot: svgData is undefined")
        }

        return svgData
    } finally {
        await page.close()
    }
}

export const DesmosGraph: QuartzTransformerPlugin = () => {
    return {
        name: "DesmosGraph",
        markdownPlugins(ctx) {
            return [
                () => async (tree, file) => {
                const nodesToProcess: { node: Code; index: number; parent: any }[] = []
                
                // 1. Collect all desmos-graph nodes
                visit(tree, "code", (node, index, parent) => {
                    if (node.lang === "desmos-graph") {
                    nodesToProcess.push({ node, index: index!, parent })
                    }
                })

                if (nodesToProcess.length === 0) return

                // 2. Ensure output directory exists
                const outputDir = path.join(ctx.argv.output, "static", "desmos")
                await fs.mkdir(outputDir, { recursive: true })

                // 3. Get a safe filename prefix from the current file path
                const filePath = file.history[0] || "unknown"
                const fileBasename = path.basename(filePath, path.extname(filePath))
                // Sanitize the filename to be filesystem-safe
                const safeBasename = fileBasename.replace(/[^a-zA-Z0-9-_]/g, '-')

                // 4. Process each node with sequential numbering per file
                let graphCount = 1
                for (const { node, index, parent } of nodesToProcess) {
                    const content = node.value

                    try {
                        // Parse Block Content
                        const split = content.split("---")
                        
                        // 1. Equations (last part)
                        const equationsRaw = split[split.length - 1]
                        const equations = equationsRaw
                            .split(/\r?\n/g)
                            .filter((equation) => equation.trim() !== "")
                            .map(parseEquation)

                        // 2. Settings (first part, if exists)
                        const settings = split.length > 1 ? parseSettings(split[0]) : {}
                        
                        // 3. Adjust Layout
                        adjustBounds(settings)
                        
                        // 4. Use sequential filename based on file and graph number
                        const filename = `${safeBasename}-desmos${graphCount}.svg`
                        const outputFilePath = path.join(outputDir, filename)

                        // 5. Generate SVG (always regenerate to ensure freshness)
                        console.log(`Generating Desmos SVG: ${filename}`)
                        const svgData = await generateDesmosSVG(equations, settings)
                        await fs.writeFile(outputFilePath, svgData, 'utf-8')
                        console.log(`Desmos SVG generated: ${filename}`)
                        
                        // 6. Transform AST to Image
                        const imageNode: any = {
                            type: "image",
                            url: `/static/desmos/${filename}`,
                            alt: "Desmos Graph",
                            title: "Desmos Graph",
                            data: {
                                hProperties: {
                                    className: ["desmos-graph"]
                                }
                            }
                        }
                        parent.children.splice(index, 1, imageNode)
                        
                        graphCount++
                    } catch (e) {
                        console.error(`Failed to process desmos graph: ${e}`)
                    }
                }

                // Close browser after processing all graphs
                await closeBrowser()
                },
            ]
        },
    }
}