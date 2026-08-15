export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024
export const UPLOAD_MAX_PIXELS = 25_000_000
export const UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const UPLOAD_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const

export type UploadPolicyResult =
    | { allowed: true }
    | { allowed: false; error: string; status: number }

export interface UploadFileMeta {
    name: string
    type: string
    size: number
}

export interface UploadImageMetadata {
    width?: number
    height?: number
    pages?: number
}

export function getSafeUploadBaseName(filename: string) {
    const withoutExtension = filename.replace(/\.[^/.]+$/, "")
    const safe = withoutExtension.replace(/[^a-zA-Z0-9._-]/g, "").replace(/^\.+/, "")
    return safe || "upload"
}

export function getFileExtension(filename: string) {
    const extension = filename.split(".").pop()?.toLowerCase()
    return extension || ""
}

export function validateUploadFileMeta(file: UploadFileMeta): UploadPolicyResult {
    if (!file.name || !file.type || !file.size) {
        return { allowed: false, error: "Hiányzó vagy érvénytelen fájladatok.", status: 400 }
    }

    if (file.size > UPLOAD_MAX_BYTES) {
        return { allowed: false, error: "A kép túl nagy. Maximum 8 MB méretű fájl tölthető fel.", status: 413 }
    }

    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as (typeof UPLOAD_ALLOWED_MIME_TYPES)[number])) {
        return { allowed: false, error: "Nem támogatott képtípus. JPG, PNG vagy WebP fájlt tölts fel.", status: 400 }
    }

    const extension = getFileExtension(file.name)
    if (!UPLOAD_ALLOWED_EXTENSIONS.includes(extension as (typeof UPLOAD_ALLOWED_EXTENSIONS)[number])) {
        return { allowed: false, error: "Nem támogatott fájlkiterjesztés. JPG, PNG vagy WebP fájlt tölts fel.", status: 400 }
    }

    return { allowed: true }
}

export function validateUploadImageMetadata(metadata: UploadImageMetadata): UploadPolicyResult {
    if (!metadata.width || !metadata.height) {
        return { allowed: false, error: "A feltöltött fájl nem olvasható képként.", status: 400 }
    }

    if (metadata.pages && metadata.pages > 1) {
        return { allowed: false, error: "Többoldalas vagy animált képfájl nem tölthető fel.", status: 400 }
    }

    if (metadata.width * metadata.height > UPLOAD_MAX_PIXELS) {
        return { allowed: false, error: "A kép felbontása túl nagy. Kérlek tölts fel kisebb képet.", status: 413 }
    }

    return { allowed: true }
}
