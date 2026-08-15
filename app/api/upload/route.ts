import { mkdir } from "fs/promises"
import { join } from "path"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import sharp from "sharp"

import { AUDIT_ACTIONS, getAuditRequestContext, writeAuditLog } from "@/lib/audit-log"
import { getActiveSessionUser } from "@/lib/auth-utils"
import {
    getSafeUploadBaseName,
    validateUploadFileMeta,
    validateUploadImageMetadata,
} from "@/lib/upload-policy"

const isDev = process.env.NODE_ENV !== "production"
const log = {
    info: (...args: unknown[]): void => { if (isDev) console.log(...args) },
    warn: (...args: unknown[]): void => { if (isDev) console.warn(...args) },
    error: (...args: unknown[]): void => { console.error(...args) },
}

const uploadAttempts = new Map<string, { count: number; resetAt: number }>()
const UPLOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const UPLOAD_RATE_LIMIT_MAX = 20

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function isBeautyAnalysis(value: unknown): value is { isBeautyRelated: boolean; reason?: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "isBeautyRelated" in value &&
        typeof (value as { isBeautyRelated: unknown }).isBeautyRelated === "boolean"
    )
}

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function jsonError(error: string, status: number) {
    return NextResponse.json({ error }, { status })
}

function checkUploadRateLimit(userId: string) {
    const now = Date.now()
    const current = uploadAttempts.get(userId)

    if (!current || current.resetAt <= now) {
        uploadAttempts.set(userId, { count: 1, resetAt: now + UPLOAD_RATE_LIMIT_WINDOW_MS })
        return true
    }

    if (current.count >= UPLOAD_RATE_LIMIT_MAX) {
        return false
    }

    current.count += 1
    return true
}

export async function POST(request: NextRequest) {
    const user = await getActiveSessionUser()
    if (!user) {
        return jsonError("Hitelesítés szükséges.", 401)
    }

    if (!checkUploadRateLimit(user.id)) {
        return jsonError("Túl sok feltöltési kísérlet. Kérlek próbáld újra később.", 429)
    }

    log.info("[UPLOAD] POST request received")
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            log.error("[UPLOAD] No file found in form data")
            return jsonError("Nem érkezett fájl.", 400)
        }

        const fileMetaCheck = validateUploadFileMeta({
            name: file.name,
            type: file.type,
            size: file.size,
        })
        if (!fileMetaCheck.allowed) {
            return jsonError(fileMetaCheck.error, fileMetaCheck.status)
        }

        log.info(`[UPLOAD] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`)
        const buffer = Buffer.from(await file.arrayBuffer())

        let metadata: sharp.Metadata
        try {
            metadata = await sharp(buffer, { animated: false }).metadata()
        } catch {
            return jsonError("A feltöltött fájl nem olvasható képként.", 400)
        }

        const imageMetadataCheck = validateUploadImageMetadata({
            width: metadata.width,
            height: metadata.height,
            pages: metadata.pages,
        })
        if (!imageMetadataCheck.allowed) {
            return jsonError(imageMetadataCheck.error, imageMetadataCheck.status)
        }

        const base64Image = buffer.toString("base64")
        const dataUrl = `data:${file.type};base64,${base64Image}`

        if (!process.env.OPENAI_API_KEY) {
            log.warn("[UPLOAD] OPENAI_API_KEY is missing, rejecting upload (fail-closed).")
            return jsonError("A képfeltöltés ellenőrzése átmenetileg nem elérhető. Kérlek próbáld újra később.", 503)
        }

        const openai = getOpenAI()

        log.info("[UPLOAD] Running safety moderation...")
        try {
            const moderation = await openai.moderations.create({
                model: "omni-moderation-latest",
                input: [{ type: "image_url", image_url: { url: dataUrl } }],
            })

            const result = moderation.results[0]
            if (result.flagged) {
                const flaggedCategories = Object.entries(result.categories)
                    .filter(([, flagged]) => flagged)
                    .map(([category]) => category)
                    .join(", ")
                log.warn(`[UPLOAD] Content flagged by moderation: ${flaggedCategories}`)
                return jsonError("A kép nem megengedett tartalmat hordoz.", 400)
            }
            log.info("[UPLOAD] Safety moderation passed")
        } catch (modErr) {
            log.error("[UPLOAD] Moderation error (fail-closed):", getErrorMessage(modErr))
            return jsonError("A képfeltöltés ellenőrzése átmenetileg nem elérhető. Kérlek próbáld újra később.", 503)
        }

        log.info("[UPLOAD] Running beauty relevance check...")
        try {
            const relevanceCheck = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 100,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze this image for a beauty-related social media platform.
Respond ONLY with a JSON object:
{"isBeautyRelated": boolean, "reason": "Hungarian explanation if rejected, otherwise empty string"}
Reject if: cars, empty landscapes, animals, unrelated objects, documents, food (unless nail art style).
Accept if: hair, nails, makeup, skin, face treatments, spa, beauty tools, hands, feet, eyelashes, eyebrows.`,
                            },
                            { type: "image_url", image_url: { url: dataUrl } },
                        ],
                    },
                ],
            })

            const text = relevanceCheck.choices[0]?.message?.content || ""
            const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim()
            const analysis: unknown = JSON.parse(cleaned)

            if (!isBeautyAnalysis(analysis)) {
                log.warn("[UPLOAD] Beauty relevance response was invalid, rejecting upload.")
                return jsonError("A képfeltöltés ellenőrzése átmenetileg nem elérhető. Kérlek próbáld újra később.", 503)
            }

            if (!analysis.isBeautyRelated) {
                log.warn(`[UPLOAD] Content rejected (not beauty related): ${analysis.reason}`)
                return jsonError(analysis.reason || "A kép nem illik a szépségápolás témakörébe.", 400)
            }
            log.info("[UPLOAD] Beauty relevance check passed")
        } catch (relevanceErr) {
            log.error("[UPLOAD] Beauty relevance check error (fail-closed):", getErrorMessage(relevanceErr))
            return jsonError("A képfeltöltés ellenőrzése átmenetileg nem elérhető. Kérlek próbáld újra később.", 503)
        }

        const relativeUploadDir = "/uploads"
        const uploadDir = process.env.UPLOAD_DIR
            ? join(process.env.UPLOAD_DIR, relativeUploadDir)
            : join(process.cwd(), "public", relativeUploadDir)
        log.info(`[UPLOAD] Saving file to: ${uploadDir}`)

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch {
            log.info("[UPLOAD] Directory already exists or error creating it (non-fatal)")
        }

        const timestamp = Date.now()
        const originalName = getSafeUploadBaseName(file.name)
        const filename = `${timestamp}-${originalName}.webp`
        const filepath = join(uploadDir, filename)

        log.info(`[UPLOAD] Processing image with sharp to: ${filepath}`)
        await sharp(buffer)
            .webp({ quality: 80 })
            .toFile(filepath)

        log.info("[UPLOAD] File saved successfully")
        const fileUrl = `/api/files/${filename}`
        await writeAuditLog({
            action: AUDIT_ACTIONS.UPLOAD_FILE,
            userId: user.id,
            entity: "Upload",
            entityId: filename,
            metadata: { url: fileUrl, originalType: file.type, size: file.size },
            ...getAuditRequestContext(request),
        })
        return NextResponse.json({ url: fileUrl })
    } catch (error) {
        log.error("[UPLOAD] UNHANDLED ERROR:", error)
        return jsonError("Rendszerhiba a feltöltés során.", 500)
    }
}
