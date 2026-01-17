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
    
    for (const line of settingsStr.split(/[;\n]/g)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        
        const [key, ...valueParts] = trimmed.split("=")
        const val = valueParts.length > 0 ? valueParts.join("=").trim() : undefined
        
        switch (key.trim()) {
            case "hideAxisNumbers":
            case "xAxisLogarithmic":
            case "yAxisLogarithmic":
            case "grid":
                settings[key.trim()] = val ? val.toLowerCase() === "true" : true
                break
            case "xAxisLabel":
            case "yAxisLabel":
                if (val) settings[key.trim()] = val
                break
            case "top":
            case "bottom":
            case "left":
            case "right":
            case "width":
            case "height":
                if (val) settings[key.trim()] = simpleEvaluate(val)
                break
            case "degreeMode":
                if (val) {
                    const mode = parseStringToEnum(DegreeMode, val)
                    if (mode) settings[key.trim()] = mode
                }
                break
            case "defaultColor":
                if (val) {
                    const color = parseColor(val)
                    if (color) settings[key.trim()] = color
                }
                break
        }
    }
    return settings
}

/// Parse equation string with support for color, style, restrictions, and labels
/// From: https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/graph/parser.ts#L144-L251 
function parseEquation(eq: string): Equation {
    const segments = eq.split("|").map(s => s.trim()).filter(s => s)
    const equation: Equation = { equation: segments.shift() || "" }

    for (const seg of segments) {
        const upper = seg.toUpperCase()
        
        // Handle boolean flags
        if (upper === "HIDDEN") { equation.hidden = true; continue }
        if (upper === "NOLINE") { equation.line = false; continue }
        
        // Handle styles (line and point)
        const style = (parseStringToEnum(LineStyle, upper) as LineStyle | null) ?? (parseStringToEnum(PointStyle, upper) as PointStyle | null)
        if (style) { equation.style = style; continue }
        
        // Handle colors
        const color = parseColor(seg)
        if (color) { equation.color = color; continue }
        
        // Handle labels
        if (upper.startsWith("LABEL:")) {
            equation.label = seg.split(":").slice(1).join(":").trim()
            continue
        }
        if (upper === "LABEL") { equation.label = ""; continue }
        
        // Everything else is a restriction
        if (!equation.restrictions) equation.restrictions = []
        equation.restrictions.push(seg)
    }

    return equation
}

// Global browser instance to reuse across all graphs for performance
let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
    if (!browserInstance) {
        const chromiumPath = "/usr/bin/chromium"
        const executablePath = existsSync(chromiumPath) ? chromiumPath : undefined
        browserInstance = await chromium.launch({ headless: true, executablePath })
    }
    return browserInstance
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close()
        browserInstance = null
    }
}

function buildDesmosExpression(eq: Equation, idx: number, defaultColor?: Color): any {
    const expr: any = {
        id: `expr-${idx}`,
        latex: eq.equation,
    }
    
    // Color handling
    if (eq.color) expr.color = eq.color
    else if (defaultColor) expr.color = defaultColor
    
    // Visibility and line settings
    if (eq.hidden) expr.hidden = true
    if (eq.line === false) expr.lines = false
    
    // Labels - only add if defined and non-empty
    if (eq.label !== undefined && eq.label !== "") {
        expr.label = eq.label
        expr.showLabel = true
    }
    
    // Style handling
    if (eq.style) {
        const styleMap: Record<string, string> = {
            [LineStyle.DASHED]: "DASHED",
            [LineStyle.DOTTED]: "DOTTED",
            [PointStyle.OPEN]: "OPEN",
            [PointStyle.CROSS]: "CROSS"
        }
        const mappedStyle = styleMap[eq.style]
        if (mappedStyle) {
            if (eq.style === LineStyle.DASHED || eq.style === LineStyle.DOTTED) {
                expr.lineStyle = mappedStyle
            } else {
                expr.pointStyle = mappedStyle
            }
        }
    }
    
    return expr
}

async function generateDesmosSVG(
    equations: Equation[],
    settings: Partial<GraphSettings>
): Promise<string> {
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        const fullSettings = { ...DEFAULT_GRAPH_SETTINGS, ...settings }
        const expressions = equations.map((eq, idx) => 
            buildDesmosExpression(eq, idx, fullSettings.defaultColor)
        )

        // Create HTML with Desmos calculator
        const html = `<!DOCTYPE html>
<html>
<head>
    <script src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
    <style>body { margin: 0; padding: 0; } #calculator { width: ${fullSettings.width}px; height: ${fullSettings.height}px; }</style>
</head>
<body>
    <div id="calculator"></div>
    <script>
        const calc = Desmos.GraphingCalculator(document.getElementById('calculator'), {
            expressions: false, settingsMenu: false, zoomButtons: false,
            expressionsTopbar: false, border: false, lockViewport: true
        });
        calc.setMathBounds({ left: ${fullSettings.left}, right: ${fullSettings.right}, bottom: ${fullSettings.bottom}, top: ${fullSettings.top} });
        calc.updateSettings({
            degreeMode: ${fullSettings.degreeMode === DegreeMode.Degrees},
            showGrid: ${fullSettings.grid},
            showXAxis: ${!fullSettings.hideAxisNumbers},
            showYAxis: ${!fullSettings.hideAxisNumbers},
            xAxisNumbers: ${!fullSettings.hideAxisNumbers},
            yAxisNumbers: ${!fullSettings.hideAxisNumbers},
            polarMode: false
        });
        ${JSON.stringify(expressions)}.forEach(expr => calc.setExpression(expr));
        window.calculator = calc;
        window.desmosReady = true;
    </script>
</body>
</html>`

        await page.setContent(html)
        await page.waitForFunction(() => (window as any).desmosReady === true, { timeout: 10000 })
        
        // Capture SVG screenshot
        const svgData: string | undefined = await page.evaluate(async ({ width, height }) => {
            const calc = (window as any).calculator
            if (!calc) return undefined
            return new Promise((resolve) => {
                calc.asyncScreenshot({
                    mode: 'preserveX',
                    width,
                    height,
                    targetPixelRatio: 1,
                    format: 'svg',
                    showLabels: true
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
                    
                    // Collect all desmos-graph nodes
                    visit(tree, "code", (node, index, parent) => {
                        if (node.lang === "desmos-graph") {
                            nodesToProcess.push({ node, index: index!, parent })
                        }
                    })

                    if (nodesToProcess.length === 0) return

                    // Setup output directory
                    const outputDir = path.join(ctx.argv.output, "static", "desmos")
                    await fs.mkdir(outputDir, { recursive: true })

                    // Get safe filename prefix from current file
                    const filePath = file.history[0] || "unknown"
                    let relativePath = filePath
                    if (path.isAbsolute(filePath)) {
                        relativePath = path.relative(ctx.argv.directory, filePath)
                    }

                    // Remove extension
                    const ext = path.extname(relativePath)
                    const nameWithoutExt = relativePath.substring(0, relativePath.length - ext.length)
                    
                    // Remove "content/notes/" or "notes/" prefix if present
                    const cleanPath = nameWithoutExt.replace(/^(content[\/\\])?notes[\/\\]/, "")
                    
                    // Create safe filename: replace directory separators and other unsafe chars with dashes
                    const safeBasename = cleanPath.replace(/[^a-zA-Z0-9-_]/g, '-')

                    // Process each graph with sequential numbering
                    let graphCount = 1
                    for (const { node, index, parent } of nodesToProcess) {
                        try {
                            const [settingsRaw, equationsRaw] = node.value.includes("---")
                                ? node.value.split("---")
                                : ["", node.value]
                            
                            const equations = equationsRaw
                                .split(/\r?\n/g)
                                .filter(line => line.trim())
                                .map(parseEquation)

                            const settings = parseSettings(settingsRaw)
                            adjustBounds(settings)
                            
                            // Generate and save SVG
                            const filename = `${safeBasename}-desmos${graphCount}.svg`
                            const outputFilePath = path.join(outputDir, filename)
                            
                            console.log(`Generating Desmos SVG: ${filename}`)
                            const svgData = await generateDesmosSVG(equations, settings)
                            await fs.writeFile(outputFilePath, svgData, 'utf-8')
                            console.log(`Desmos SVG generated: ${filename}`)
                            
                            // Replace code block with image
                            parent.children.splice(index, 1, {
                                type: "image",
                                url: `/static/desmos/${filename}`,
                                alt: "Desmos Graph",
                                title: "Desmos Graph",
                                data: { hProperties: { className: ["desmos-graph"] } }
                            })
                            
                            graphCount++
                        } catch (e) {
                            console.error(`Failed to process desmos graph: ${e}`)
                        }
                    }

                    await closeBrowser()
                },
            ]
        },
    }
}