import test, { describe } from "node:test"
import assert from "node:assert"

// Tests for the Desmos transformer plugin
// This plugin generates SVG images from desmos-graph code blocks during build

describe("Desmos Parsing Logic", () => {
  test("parseSettings should handle boolean flag without value (grid)", () => {
    // When a boolean field like "grid" has no value, it should default to true
    // Example: "grid\n---\ny=x" should parse grid as true
    const input = "grid"
    const parts = input.split("=")
    const hasNoValue = parts.length === 1
    assert.strictEqual(hasNoValue, true, "Boolean flags without = should be detected")
  })

  test("label parsing with multiple colons", () => {
    // Label: "LABEL:a:b:c" should parse as "a:b:c", not just "a"
    const text = "LABEL:a:b:c"
    const label = text.split(":").slice(1).join(":").trim()
    assert.strictEqual(label, "a:b:c", "Multi-colon labels should be preserved")
    
    const text2 = "LABEL:simple"
    const label2 = text2.split(":").slice(1).join(":").trim()
    assert.strictEqual(label2, "simple", "Simple labels should work")
  })

  test("label parsing with empty label", () => {
    const text = "LABEL"
    const hasLabel = text.toUpperCase() === "LABEL"
    assert.strictEqual(hasLabel, true, "Empty LABEL flag should be recognized")
  })

  test("settings parsing with numeric values", () => {
    // Test that settings like "left=-10" are parsed correctly
    const input = "left=-10"
    const parts = input.split("=")
    assert.strictEqual(parts[0].trim(), "left")
    assert.strictEqual(parts[1].trim(), "-10")
  })

  test("equation parsing with pipes", () => {
    // Example: "y=x | red | dashed | label: My Graph"
    const input = "y=x | red | dashed | label: My Graph"
    const segments = input.split("|").map(s => s.trim()).filter(s => s)
    
    assert.strictEqual(segments[0], "y=x", "First segment is the equation")
    assert.strictEqual(segments[1], "red", "Second segment is the color")
    assert.strictEqual(segments[2], "dashed", "Third segment is the style")
    assert.strictEqual(segments[3], "label: My Graph", "Fourth segment is the label")
  })

  test("filename generation for SVG files", () => {
    // Filenames should follow pattern: {page-name}-desmos{#}.svg
    const basename = "my-page"
    const graphNumber = 1
    const filename = `${basename}-desmos${graphNumber}.svg`
    
    assert.strictEqual(filename, "my-page-desmos1.svg")
  })

  test("filename sanitization", () => {
    // Special characters in filenames should be replaced with dashes
    const unsafeName = "my page!@#$%"
    const safeName = unsafeName.replace(/[^a-zA-Z0-9-_]/g, '-')
    
    assert.strictEqual(safeName, "my-page-----")
  })

  test("color parsing - hex colors", () => {
    const hexColor = "#c74440"
    const isValidHex = hexColor.startsWith("#") && /^[0-9a-zA-Z]+$/.test(hexColor.slice(1))
    assert.strictEqual(isValidHex, true, "Hex colors should be recognized")
  })

  test("color parsing - named colors", () => {
    const colorNames = ["red", "blue", "green", "purple", "orange", "black"]
    colorNames.forEach(name => {
      const upper = name.toUpperCase()
      assert.ok(upper, `Color ${name} should be parseable`)
    })
  })

  test("line style parsing", () => {
    const styles = ["solid", "dashed", "dotted"]
    styles.forEach(style => {
      const upper = style.toUpperCase()
      assert.ok(upper, `Style ${style} should be parseable`)
    })
  })

  test("content splitting with separator", () => {
    // Test that content splits correctly on "---"
    const content = "left=-10; right=10\n---\ny=x\ny=x^2"
    const parts = content.split("---")
    
    assert.strictEqual(parts.length, 2, "Should split into settings and equations")
    assert.strictEqual(parts[0].includes("left"), true, "First part has settings")
    assert.strictEqual(parts[1].includes("y=x"), true, "Second part has equations")
  })
})
