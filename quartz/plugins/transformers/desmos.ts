// quartz/plugins/transformers/desmos.ts
import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Code } from "mdast"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

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

export const DesmosGraph: QuartzTransformerPlugin = () => {
    return {
        name: "DesmosGraph",
        markdownPlugins(ctx) {
            return [
                () => async (tree, _file) => {
                const nodesToProcess: { node: Code; index: number; parent: any }[] = []
                
                // 1. Collect all desmos-graph nodes
                visit(tree, "code", (node, index, parent) => {
                    if (node.lang === "desmos-graph") {
                    nodesToProcess.push({ node, index: index!, parent })
                    console.log("Found desmos-graph code block to process.")
                    }
                })

                if (nodesToProcess.length === 0) return

                // 2. Ensure directory exists logic or just point to it
                // Assuming content/notes/.desmos is the destination
                const desmosDir = path.join(ctx.argv.directory, "notes", ".desmos")

                // 3. Process each node
                for (const { node, index, parent } of nodesToProcess) {
                    const content = node.value

                    try {
                        // Parse Block Content
                        
                        // #################################################################
                        // A: Parsing Logic Begins Here. 
                        // https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/graph/parser.ts#L94-L119 
                        // ################################################################# 
                        const split = content.split("---")
                        
                        // 1. Equations (last part)
                        const equationsRaw = split[split.length - 1]
                        const equations = equationsRaw
                            .split(/\r?\n/g)
                            .filter((equation) => equation.trim() !== "")
                            .map(parseEquation)
                            // skip error hint since at this point it should NOT FAIL (otherwise no svg would exist anyway)

                        // 2. Settings (first part, if exists)
                        const settings = split.length > 1 ? parseSettings(split[0]) : {}
                        
                        // ##############################################################
                        // B: Bounds adjustment logic
                        // https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/graph/parser.ts#L64-L92 
                        // https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/graph/parser.ts#L368-L399
                        // ##############################################################
                        // 3. Adjust Layout
                        adjustBounds(settings)
                        
                        // ##############################################################
                        // C: Hashing 
                        // https://github.com/Nigecat/obsidian-desmos/blob/323349d728a90fadf788cfb2bbcc9b936ac1548d/src/utils.ts#L3-L21 
                        // ##############################################################
                        // 4. Calculate Hash
                        // We structure the object exactly as obsidian-desmos does: { equations, settings }
                        const graphObj = { equations, settings }
                        const hash = crypto.createHash("sha256").update(JSON.stringify(graphObj)).digest("hex")

                        const filename = `desmos-graph-${hash}.svg`
                        const filePath = path.join(desmosDir, filename)

                        console.log(`Processing desmos-graph code block. Hash: ${hash}`)

                        // Check if SVG exists
                        try {
                            await fs.access(filePath)
                            
                            // 5. Transform AST to Image if file exists
                            const imageNode: any = {
                                type: "image",
                                url: `/notes/desmos/${filename}`, // Absolute path from site root
                                alt: "Desmos Graph",
                                title: "Desmos Graph",
                                data: {
                                    hProperties: {
                                        className: ["desmos-graph"]
                                    }
                                }
                            }
                            console.log(`Desmos SVG found: ${filename}. Replacing code block.`)
                            parent.children.splice(index, 1, imageNode)
                        } catch {
                            // If file is missing, we leave the code block alone
                            console.warn(`Desmos SVG not found: ${filename} (Hash: ${hash}).`)
                        }
                        } catch (e) {
                            console.error(`Failed to parse/hash desmos block: ${e}`)
                        }
                    }
                },
            ]
        },
    }
}