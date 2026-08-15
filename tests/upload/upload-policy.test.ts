import { describe, expect, it } from "vitest"

import {
    UPLOAD_MAX_BYTES,
    getSafeUploadBaseName,
    validateUploadFileMeta,
    validateUploadImageMetadata,
} from "../../lib/upload-policy"

describe("upload policy", () => {
    it("accepts supported image metadata", () => {
        expect(validateUploadFileMeta({ name: "salon.jpg", type: "image/jpeg", size: 1024 }).allowed).toBe(true)
        expect(validateUploadFileMeta({ name: "salon.png", type: "image/png", size: 1024 }).allowed).toBe(true)
        expect(validateUploadFileMeta({ name: "salon.webp", type: "image/webp", size: 1024 }).allowed).toBe(true)
    })

    it("rejects invalid mime types", () => {
        const result = validateUploadFileMeta({ name: "salon.txt", type: "text/plain", size: 1024 })

        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.status).toBe(400)
    })

    it("rejects oversized files before image processing", () => {
        const result = validateUploadFileMeta({ name: "salon.jpg", type: "image/jpeg", size: UPLOAD_MAX_BYTES + 1 })

        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.status).toBe(413)
    })

    it("rejects files without readable image dimensions", () => {
        const result = validateUploadImageMetadata({})

        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.status).toBe(400)
    })

    it("sanitizes unsafe base filenames", () => {
        expect(getSafeUploadBaseName("../../szalon kép.jpg")).toBe("szalonkp")
        expect(getSafeUploadBaseName("!!!.png")).toBe("upload")
    })
})
