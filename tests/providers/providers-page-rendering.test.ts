import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("providers page rendering mode", () => {
  it("renders dynamically so salon data is not frozen during Docker build", () => {
    const source = readFileSync(join(process.cwd(), "app/providers/page.tsx"), "utf8")

    expect(source).toContain('export const dynamic = "force-dynamic"')
  })
})
