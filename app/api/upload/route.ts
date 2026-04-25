import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import OpenAI from "openai";
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getAuditRequestContext, writeAuditLog } from "@/lib/audit-log"

const isDev = process.env.NODE_ENV !== "production"
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 10
const uploadRateLimit = new Map<string, number[]>()
/* eslint-disable no-console */
const log = {
    info: (...args: unknown[]): void => { if (isDev) console.log(...args) },
    warn: (...args: unknown[]): void => { if (isDev) console.warn(...args) },
    error: (...args: unknown[]): void => { console.error(...args) },
}
/* eslint-enable no-console */

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function getRateLimitKey(request: NextRequest, userId: string) {
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
    return `${userId}:${ip}`
}

function isRateLimited(key: string) {
    const now = Date.now()
    const recentRequests = (uploadRateLimit.get(key) || []).filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    )

    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
        uploadRateLimit.set(key, recentRequests)
        return true
    }

    recentRequests.push(now)
    uploadRateLimit.set(key, recentRequests)
    return false
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Hitelesítés szükséges." }, { status: 401 })
    }

    const auditContext = getAuditRequestContext(request)
    const rateLimitKey = getRateLimitKey(request, session.user.id)
    if (isRateLimited(rateLimitKey)) {
        return NextResponse.json(
            { error: "Túl sok feltöltési kísérlet. Próbáld újra később." },
            { status: 429 }
        )
    }

    log.info("[UPLOAD] POST request received")
    try {
        const formData = await request.formData()
        const file = formData.get("file")

        if (!(file instanceof File)) {
            log.error("[UPLOAD] No file found in form data")
            return NextResponse.json({ error: "No file received." }, { status: 400 })
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            log.warn(`[UPLOAD] Rejected unsupported file type: ${file.type || "unknown"}`)
            return NextResponse.json(
                { error: "Csak JPG, PNG, WebP vagy GIF képfájl tölthető fel." },
                { status: 400 }
            )
        }

        if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
            log.warn(`[UPLOAD] Rejected file size: ${file.size} bytes`)
            return NextResponse.json(
                { error: "A feltölthető kép maximum 5 MB lehet." },
                { status: 400 }
            )
        }

        log.info(`[UPLOAD] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`)
        const buffer = Buffer.from(await file.arrayBuffer())
        const base64Image = buffer.toString("base64")
        const dataUrl = `data:${file.type};base64,${base64Image}`

        if (!process.env.OPENAI_API_KEY) {
            log.error("[UPLOAD] OPENAI_API_KEY is missing, rejecting upload.")
            return NextResponse.json(
                { error: "A feltöltés ideiglenesen nem elérhető." },
                { status: 503 }
            )
        }

        const openai = getOpenAI()

        // --- 1. Safety check with omni-moderation-latest ---
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
                return NextResponse.json(
                    { error: "A kép nem megengedett tartalmat hordoz." },
                    { status: 400 }
                )
            }
            log.info("[UPLOAD] Safety moderation passed")
        } catch (modErr: any) {
            log.error("[UPLOAD] Moderation error:", modErr?.message || modErr)
            return NextResponse.json(
                { error: "A kép ellenőrzése nem sikerült biztonságosan." },
                { status: 503 }
            )
        }

        // --- 2. Beauty relevance check with gpt-4o-mini ---
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
            const analysis = JSON.parse(cleaned)

            if (!analysis.isBeautyRelated) {
                log.warn(`[UPLOAD] Content rejected (not beauty related): ${analysis.reason}`)
                return NextResponse.json(
                    { error: analysis.reason || "A kép nem illik a szépségápolás témakörébe." },
                    { status: 400 }
                )
            }
            log.info("[UPLOAD] Beauty relevance check passed")
        } catch (relevanceErr: any) {
            log.error("[UPLOAD] Beauty relevance check error:", relevanceErr?.message || relevanceErr)
            return NextResponse.json(
                { error: "A kép tartalmi ellenőrzése nem sikerült biztonságosan." },
                { status: 503 }
            )
        }

        // --- 3. Convert to WebP & Save ---
        const relativeUploadDir = "/uploads"
        const uploadDir = process.env.UPLOAD_DIR
            ? join(process.env.UPLOAD_DIR, relativeUploadDir)
            : join(process.cwd(), "public", relativeUploadDir)
        log.info(`[UPLOAD] Saving file to: ${uploadDir}`)

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            log.info("[UPLOAD] Directory already exists or error creating it (non-fatal)")
        }

        const timestamp = Date.now()
        const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "")
        const filename = `${timestamp}-${originalName}.webp`
        const filepath = join(uploadDir, filename)

        log.info(`[UPLOAD] Processing image with sharp to: ${filepath}`)
        await sharp(buffer)
            .webp({ quality: 80 })
            .toFile(filepath)

        log.info("[UPLOAD] File saved successfully")
        const fileUrl = `/api/files/${filename}`

        await writeAuditLog({
            action: "UPLOAD_FILE",
            userId: session.user.id,
            entity: "FILE",
            entityId: filename,
            metadata: {
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                storedFileName: filename
            },
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent
        })
        return NextResponse.json({ url: fileUrl })
    } catch (error) {
        log.error("[UPLOAD] UNHANDLED ERROR:", error)
        return NextResponse.json(
            { error: "Rendszerhiba a feltöltés során." },
            { status: 500 }
        )
    }
}
