import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import OpenAI from "openai";
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const isDev = process.env.NODE_ENV !== "production"
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

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Hitelesítés szükséges." }, { status: 401 })
    }

    log.info("[UPLOAD] POST request received");
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            log.error("[UPLOAD] No file found in form data");
            return NextResponse.json({ error: "No file received." }, { status: 400 });
        }

        log.info(`[UPLOAD] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Image = buffer.toString("base64");
        const dataUrl = `data:${file.type};base64,${base64Image}`;

        if (!process.env.OPENAI_API_KEY) {
            log.warn("[UPLOAD] OPENAI_API_KEY is missing, skipping AI moderation (fail-open).");
        } else {
            const openai = getOpenAI();

            // --- 1. Safety check with omni-moderation-latest (FREE) ---
            log.info("[UPLOAD] Running safety moderation...");
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
                log.info("[UPLOAD] Safety moderation passed");
            } catch (modErr: any) {
                log.error("[UPLOAD] Moderation error (fail-open):", modErr?.message || modErr);
            }

            // --- 2. Beauty relevance check with gpt-4o-mini ---
            log.info("[UPLOAD] Running beauty relevance check...");
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
                log.info("[UPLOAD] Beauty relevance check passed");
            } catch (relevanceErr: any) {
                log.error("[UPLOAD] Beauty relevance check error (fail-open):", relevanceErr?.message || relevanceErr);
            }
        }

        // --- 3. Convert to WebP & Save ---
        const relativeUploadDir = "/uploads";
        const uploadDir = process.env.UPLOAD_DIR
            ? join(process.env.UPLOAD_DIR, relativeUploadDir)
            : join(process.cwd(), "public", relativeUploadDir);
        log.info(`[UPLOAD] Saving file to: ${uploadDir}`);

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            log.info("[UPLOAD] Directory already exists or error creating it (non-fatal)");
        }

        const timestamp = Date.now();
        const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "");
        const filename = `${timestamp}-${originalName}.webp`;
        const filepath = join(uploadDir, filename);

        log.info(`[UPLOAD] Processing image with sharp to: ${filepath}`);
        await sharp(buffer)
            .webp({ quality: 80 })
            .toFile(filepath);

        log.info("[UPLOAD] File saved successfully");
        const fileUrl = `/api/files/${filename}`;
        return NextResponse.json({ url: fileUrl });
    } catch (error) {
        log.error("[UPLOAD] UNHANDLED ERROR:", error);
        return NextResponse.json(
            { error: "Rendszerhiba a feltöltés során." },
            { status: 500 }
        );
    }
}
