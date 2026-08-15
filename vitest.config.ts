import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

/**
 * A projekt a `@/...` path aliast használja (lásd tsconfig.json `paths`).
 * Vitest önmagában nem olvassa a tsconfig-ot, ezért itt is fel kell oldani,
 * különben a tesztek elszállnak minden olyan modulon, amit nem mockolunk explicit.
 */
export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
})
