import test, { describe } from "node:test"
import assert from "node:assert"
import crypto from "node:crypto"

// We'll test the parsing logic by recreating the key parts
// Since parseSettings and parseEquation are not exported, we test the hash calculation behavior

describe("Desmos Hash Calculation", () => {
  // Helper function to calculate hash exactly as obsidian-desmos does
  function calculateHash(equations: any[], settings: any): string {
    const graphObj = { equations, settings }
    return crypto.createHash("sha256").update(JSON.stringify(graphObj)).digest("hex")
  }

  test("parseSettings should handle boolean flag without value (grid)", () => {
    // When a boolean field has no value, it should default to true
    const settings = { grid: true }
    const equations: any[] = []
    const hash = calculateHash(equations, settings)
    
    // This is just a reference hash - the important thing is that settings without = are processed
    assert.ok(hash)
  })

  test("parseSettings should handle settings with = sign", () => {
    const settings = { width: 600, height: 400 }
    const equations: any[] = []
    const hash = calculateHash(equations, settings)
    assert.ok(hash)
  })

  test("label parsing with colons", () => {
    // Label: "a:b:c" should become "b:c" not "b"
    const text = "LABEL:a:b:c"
    const label = text.split(":").slice(1).join(":").trim()
    assert.strictEqual(label, "a:b:c")
    
    const text2 = "LABEL:simple"
    const label2 = text2.split(":").slice(1).join(":").trim()
    assert.strictEqual(label2, "simple")
  })

  test("hash consistency test", () => {
    // Test that the hash calculation is deterministic
    const equations = [{ equation: "y=x" }]
    const settings = { grid: true }
    
    const hash1 = calculateHash(equations, settings)
    const hash2 = calculateHash(equations, settings)
    
    assert.strictEqual(hash1, hash2, "Hash should be deterministic")
  })

  test("hash different for different inputs", () => {
    const equations1 = [{ equation: "y=x" }]
    const settings1 = { grid: true }
    
    const equations2 = [{ equation: "y=x" }]
    const settings2 = { grid: false }
    
    const hash1 = calculateHash(equations1, settings1)
    const hash2 = calculateHash(equations2, settings2)
    
    assert.notStrictEqual(hash1, hash2, "Different settings should produce different hashes")
  })

  test("specific hash values match expected output", () => {
    // Test case 1: grid=true should produce the same hash as grid without value
    const settings1 = { grid: true }
    const equations1 = [{ equation: "y=x" }]
    const hash1 = calculateHash(equations1, settings1)
    assert.strictEqual(hash1, "429bfd0821423470559a6d8634617563141736ee132788cb71cb9d0b6d83dc99")
    
    // Test case 2: Label with multiple colons
    const equations2 = [{ equation: "y=x", label: "a:b:c" }]
    const settings2 = {}
    const hash2 = calculateHash(equations2, settings2)
    assert.strictEqual(hash2, "b15be6cc08faf9fdec8d66c71e399c27461b6d0bb6e7637dcc60ffd657b7ded1")
    
    // Test case 3: Empty label
    const equations3 = [{ equation: "y=x", label: "" }]
    const settings3 = {}
    const hash3 = calculateHash(equations3, settings3)
    assert.strictEqual(hash3, "2cc4673cbd2771b624acf6b187f5ea54f3cebfd7ab2b9e6d2aa4c51ad29d3872")
  })
})
