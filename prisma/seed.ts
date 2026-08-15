import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import "dotenv/config"
import { generateUniqueSlug } from "../lib/slug"

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    // Clear existing data
    await prisma.comment.deleteMany()
    await prisma.like.deleteMany()
    await prisma.review.deleteMany()
    await prisma.post.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.openingHour.deleteMany()
    await prisma.service.deleteMany()
    await prisma.message.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.salon.deleteMany()
    await prisma.user.deleteMany()
    await prisma.category.deleteMany()

    // Create Categories
    const categoryList = [
        { name: "Fodrászat", slug: "hair", icon: "Scissors", order: 1 },
        { name: "Kozmetika", slug: "skin", icon: "Sparkles", order: 2 },
        { name: "Kézápolás", slug: "nails", icon: "Hand", order: 3 },
        { name: "Pedikűr", slug: "pedi", icon: "User", order: 4 },
        { name: "Smink", slug: "makeup", icon: "Palette", order: 5 },
        { name: "Masszázs", slug: "massage", icon: "Waves", order: 6 },
        { name: "Testkezelés", slug: "body", icon: "Smile", order: 7 },
    ]

    for (const cat of categoryList) {
        await prisma.category.create({ data: cat })
    }

    const password = await bcrypt.hash('password123', 10)

    // Create Users
    const users = await Promise.all([
        prisma.user.upsert({
            where: { email: 'admin@glowyspot.com' },
            update: { password },
            create: {
                email: 'admin@glowyspot.com',
                name: 'Admin User',
                password,
                role: 'admin'
            }
        }),
        prisma.user.upsert({
            where: { email: 'provider1@glowyspot.com' },
            update: { password },
            create: {
                email: 'provider1@glowyspot.com',
                name: 'Kovács Anita',
                password,
                role: 'provider'
            }
        }),
        prisma.user.upsert({
            where: { email: 'provider2@glowyspot.com' },
            update: { password },
            create: {
                email: 'provider2@glowyspot.com',
                name: 'Nagy Béla',
                password,
                role: 'provider'
            }
        }),
        prisma.user.upsert({
            where: { email: 'visitor1@glowyspot.com' },
            update: { password },
            create: {
                email: 'visitor1@glowyspot.com',
                name: 'Teszt Látogató',
                password,
                role: 'visitor'
            }
        }),
        prisma.user.upsert({
            where: { email: 'single_provider@glowyspot.com' },
            update: { password },
            create: {
                email: 'single_provider@glowyspot.com',
                name: 'Egy Szalonos Szolgáltató',
                password,
                role: 'provider'
            }
        })
    ])

    const owner1 = users[1] // provider1 (Multiple salons)
    const owner2 = users[2] // provider2
    const singleOwner = users[4] // single_provider

    const cities = ["Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Nyíregyháza", "Kecskemét", "Székesfehérvár", "Szombathely"]
    const categories = ["Fodrászat", "Kozmetika", "Kézápolás", "Lábápolás", "Masszázs"]

    // Uploaded images
    const cosmeticImages = [
        "/uploads/kosmetik_01.png",
        "/uploads/kosmetik_stock_02.png",
        "/uploads/kosmetik_stock_03.png",
        "/uploads/kosmetik_stock_04.png",
        "/uploads/kosmetik_stock_05.png",
        "/uploads/kosmetik_stock_06.png",
        "/uploads/kozmetika_stock_01.png"
    ]

    const pedicureImages = [
        "/uploads/fuss_02.png",
        "/uploads/fuss_03.png",
        "/uploads/fuss_04.png",
        "/uploads/pedicure_stock.png",
        "/uploads/pedicure_stock_02.png",
        "/uploads/pedicure_stock_03.png",
        "/uploads/pedicure_stock_04.png",
        "/uploads/pedicure_stock_05.png",
        "/uploads/pedicure_stock_06.png"
    ]

    const allImages = [...cosmeticImages, ...pedicureImages]
    void cities
    void categories
    void allImages

    const salonsData = [
        {
            name: "Glamour Szalon",
            city: "Budapest",
            district: "V. kerület",
            address: "Váci út 1-3",
            categories: ["hair", "skin"],
            ownerId: owner1.id,
            profileImage: cosmeticImages[0],
            coverImage: cosmeticImages[1]
        },
        {
            name: "Harmónia Wellness",
            city: "Debrecen",
            address: "Piac utca 20",
            categories: ["massage", "testkezelés"],
            ownerId: owner2.id,
            profileImage: cosmeticImages[2],
            coverImage: cosmeticImages[3]
        },
        {
            name: "Nails by Anna",
            city: "Szeged",
            address: "Kárász utca 5",
            categories: ["nails"],
            ownerId: owner1.id,
            profileImage: pedicureImages[0],
            coverImage: pedicureImages[1]
        },
        {
            name: "Classic Barbershop",
            city: "Miskolc",
            address: "Széchenyi utca 15",
            categories: ["hair"],
            ownerId: owner2.id,
            profileImage: cosmeticImages[4],
            coverImage: cosmeticImages[5]
        },
        {
            name: "Zen Stúdió",
            city: "Pécs",
            address: "Király utca 10",
            categories: ["massage"],
            ownerId: owner1.id,
            profileImage: pedicureImages[2],
            coverImage: pedicureImages[3]
        },
        {
            name: "Modern Beauty",
            city: "Győr",
            address: "Baross Gábor út 8",
            categories: ["skin", "body"],
            ownerId: owner2.id,
            profileImage: cosmeticImages[6],
            coverImage: cosmeticImages[0]
        },
        {
            name: "Diamond Spa",
            city: "Nyíregyháza",
            address: "Kossuth tér 2",
            categories: ["massage", "skin"],
            ownerId: owner1.id,
            profileImage: pedicureImages[4],
            coverImage: pedicureImages[5]
        },
        {
            name: "Stílus Fodrászat",
            city: "Kecskemét",
            address: "Nagykőrösi utca 3",
            categories: ["hair"],
            ownerId: owner2.id,
            profileImage: cosmeticImages[1],
            coverImage: cosmeticImages[2]
        },
        {
            name: "Royal Beauty",
            city: "Székesfehérvár",
            address: "Fő utca 12",
            categories: ["skin", "nails"],
            ownerId: owner1.id,
            profileImage: pedicureImages[6],
            coverImage: pedicureImages[7]
        },
        {
            name: "Elite Cut",
            city: "Szombathely",
            address: "Fő tér 5",
            categories: ["hair"],
            ownerId: owner2.id,
            profileImage: cosmeticImages[3],
            coverImage: cosmeticImages[4]
        },
        {
            name: "Single Salon Studio",
            city: "Budapest",
            address: "Kis utca 1",
            categories: ["skin"],
            ownerId: singleOwner.id,
            profileImage: cosmeticImages[5],
            coverImage: cosmeticImages[6]
        },
    ]

    // Teszt szalonok fingerprintjei (hash alapú, itt egyszerűsítve salonName alapján)
    const { createHash } = await import("crypto")
    const makeFingerprint = (phone: string | null, address: string) => {
        const normalizedPhone = (phone || "").replace(/\D/g, "")
        const normalizedAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim()
        return createHash("sha256").update(`${normalizedPhone}|${normalizedAddress}`).digest("hex")
    }

    // FREE előfizetés: 60 nap próba, de a teszt szalonoknak adjunk eltérő lejáratokat a badge demo-hoz
    const now = new Date()
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

    // Szalonok sorrendje alapján különböző lejáratok a badge demo-hoz
    const freeExpiries = [
        daysFromNow(58),  // Glamour Szalon - 58 nap
        daysFromNow(2),   // Harmónia Wellness - 2 nap (piros - kritikus)
        daysFromNow(60),  // Nails by Anna - 60 nap
        daysFromNow(10),  // Classic Barbershop - 10 nap (sárga)
        daysFromNow(45),  // Zen Stúdió
        daysFromNow(30),  // Modern Beauty
        daysFromNow(5),   // Diamond Spa - 5 nap (sárga)
        daysFromNow(60),  // Stílus Fodrászat
        daysFromNow(60),  // Royal Beauty
        daysFromNow(60),  // Elite Cut
        daysFromNow(60),  // Single Salon Studio
    ]

    let salonIndex = 0
    for (const s of salonsData) {
        const fingerprint = makeFingerprint(null, s.address)
        const slug = await generateUniqueSlug(s.name, prisma)
        const salon = await prisma.salon.create({
            data: {
                ...s,
                slug,
                currency: "HUF",
                rating: 4.5 + Math.random() * 0.5,
                reviewCount: Math.floor(Math.random() * 50),
                images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"],
                languages: ["Hungarian", "English"],
                lat: 47.4979 + (Math.random() - 0.5) * 0.1,
                lng: 19.0402 + (Math.random() - 0.5) * 0.1,
                salonFingerprint: fingerprint,
            }
        })

        // FREE Subscription rekord létrehozása minden szalonhoz
        await prisma.subscription.create({
            data: {
                salonId: salon.id,
                plan: "FREE",
                status: "ACTIVE",
                billingCurrency: "HUF",
                freeStartedAt: now,
                freeExpiresAt: freeExpiries[salonIndex] || daysFromNow(60),
                postWindowStart: now,
                postCountInWindow: 0,
            }
        })
        salonIndex++

        // Create Opening Hours
        const days = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"]
        for (const day of days) {
            await prisma.openingHour.create({
                data: {
                    salonId: salon.id,
                    day,
                    open: "08:00",
                    close: "18:00",
                    isOpen: day !== "Vasárnap"
                }
            })
        }

        // Create Services
        for (let i = 1; i <= 3; i++) {
            await prisma.service.create({
                data: {
                    salonId: salon.id,
                    name: `Szolgáltatás ${i}`,
                    price: (1000 * i).toString(),
                    duration: "60 perc"
                }
            })
        }

        // Create Posts
        for (let i = 1; i <= 6; i++) {
            // Randomly pick an image from the uploaded set based on salon category if possible, or just random
            const salonImages = s.categories.includes("Masszázs") || s.categories.includes("Lábápolás") ? pedicureImages : cosmeticImages;
            const randomImage = salonImages[Math.floor(Math.random() * salonImages.length)];
            const randomImage2 = salonImages[Math.floor(Math.random() * salonImages.length)];

            const postImages = i % 2 === 0
                ? [randomImage, randomImage2]
                : [randomImage];

            await prisma.post.create({
                data: {
                    content: `Ez egy példa bejegyzés a ${salon.name} szalonból. Gyertek el hozzánk egy kis felfrissülésre! #${s.categories[0]} #szepseg`,
                    images: postImages,
                    salonId: salon.id,
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000))
                }
            })
        }
    }

    console.log('Seed completed successfully')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
