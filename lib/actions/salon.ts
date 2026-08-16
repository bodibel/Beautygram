"use server"


import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { existsSync } from "fs"
import { join } from "path"
import prisma from "@/lib/db"
import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { canPublishSalon, getSalonQuotaStatus, type PublishPolicyResult } from "@/lib/salon-publishing"
import { generateUniqueSlug } from "@/lib/slug"
import { PUBLIC_SALON_WHERE, isSalonPubliclyVisible } from "@/lib/salon-visibility"
import { requireSession } from "@/lib/auth-utils"
import {
    canAcceptBookingRequest,
    canCancelMyBooking,
    canHandleBookingRequest,
    formatBookingDecisionMessage,
    formatBookingVisitorCancellationMessage,
    validateBookingRequestFields,
} from "@/lib/booking/booking-policy"
import {
  generateSalonFingerprint,
  checkFingerprintDuplicate,
  initSubscription,
  canCreatePost,
  incrementPostCount,
  canUploadVideo,
} from "@/lib/subscription"

type TeamMemberInput = {
    name: string
    role?: string | null
    description?: string | null
    image?: string | null
}

type UpdateSalonInput = Prisma.SalonUncheckedUpdateInput & {
    teamMembers?: TeamMemberInput[]
}

type CreateSalonInput = {
    name: string
    country?: string
    city?: string
    district?: string | null
    street?: string | null
    houseNumber?: string | null
    floor?: string | null
    door?: string | null
    zipCode?: string | null
    address: string
    currency: string
    categories?: string[]
    categoryIds?: string[]
    ownerId?: string
    images?: string[]
    profileImage?: string | null
    image?: string | null
    coverImage?: string | null
    languages?: string[]
    lat?: number | null
    lng?: number | null
    phone?: string | null
    email?: string | null
    allowMessages?: boolean
    allowBookings?: boolean
    showPhoneOnProfile?: boolean
    showEmailOnProfile?: boolean
    notifyNewMessage?: boolean
    notifyNewBooking?: boolean
    notifyNewReview?: boolean
    notifyNewFavorite?: boolean
    notifyPostLike?: boolean
    notifyPostComment?: boolean
    notifyWeeklyStats?: boolean
    notifyMonthlyStats?: boolean
    ownerName?: string | null
    ownerImage?: string | null
    aboutMe?: string | null
    isTeam?: boolean
    teamMembers?: TeamMemberInput[]
}

type ServiceInput = {
    salonId: string
    name: string
    price: string | number
    duration: string | number
    description?: string | null
}

type OpeningHourInput = {
    day: string
    open?: string | null
    close?: string | null
    isOpen: boolean
}

type ClosedDateInput = {
    salonId: string
    date: string
    reason: string
}

type PostInput = {
    salonId: string
    content: string
    images?: string[]
    videos?: string[]
    layout?: string
}

type BookingInput = {
    date: string | Date
    time: string
    userId: string
    salonId: string
    serviceId: string
}

function localUploadPath(filename: string): string {
    return process.env.UPLOAD_DIR
        ? join(process.env.UPLOAD_DIR, "uploads", filename)
        : join(process.cwd(), "public", "uploads", filename)
}

function isDisplayableImage(src?: string | null): src is string {
    if (!src) return false
    if (/^(https?:|data:|blob:)/.test(src)) return true

    const path = src.split("?")[0]
    const prefix = path.startsWith("/api/files/") ? "/api/files/" : path.startsWith("/uploads/") ? "/uploads/" : null
    if (!prefix) return true

    const rawFilename = path.slice(prefix.length)
    let filename: string
    try {
        filename = decodeURIComponent(rawFilename)
    } catch {
        return false
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "")
    return Boolean(safeFilename && safeFilename === filename && existsSync(localUploadPath(safeFilename)))
}

function displayableImages(images?: string[] | null): string[] {
    return (images || []).filter(isDisplayableImage)
}

function requireNonEmptyText(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${fieldName} megadása kötelező.`)
    }
    return value.trim()
}

function requirePositiveNumber(value: unknown, fieldName: string): string {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${fieldName} csak pozitív szám lehet.`)
    }
    return String(value)
}

async function requireSelf(userId: string): Promise<string> {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) {
        throw new Error("Nincs jogosultságod ehhez a felhasználói adathoz.")
    }
    return sessionUserId
}

async function requireSalonOwner(salonId: string): Promise<string> {
    const sessionUserId = await requireSession()
    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { ownerId: true }
    })
    if (!salon) throw new Error("A szalon nem található.")
    if (salon.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod ehhez a szalonhoz.")
    return sessionUserId
}

async function requirePostOwner(postId: string): Promise<void> {
    const sessionUserId = await requireSession()
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { salon: { select: { ownerId: true } } }
    })
    if (!post) throw new Error("A bejegyzés nem található.")
    if (post.salon.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod ehhez a bejegyzéshez.")
}

async function requireServiceOwner(serviceId: string): Promise<void> {
    const sessionUserId = await requireSession()
    const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { salon: { select: { ownerId: true } } }
    })
    if (!service) throw new Error("A szolgáltatás nem található.")
    if (service.salon.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod ehhez a szolgáltatáshoz.")
}

export async function getSalonData(salonId: string, userId: string) {
    const sessionUserId = await requireSelf(userId)
    try {
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            include: {
                services: true,
                openingHours: true,
                closedDates: true,
                posts: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!salon || salon.ownerId !== sessionUserId) {
            return null
        }

        return {
            salon,
            services: salon.services,
            openingHours: salon.openingHours,
            closedDates: salon.closedDates,
            posts: salon.posts
        }
    } catch (error) {
        console.error("Error fetching salon data from Prisma:", error)
        throw error
    }
}

export async function getSalonName(salonId: string) {
    try {
        return await prisma.salon.findUnique({
            where: { id: salonId },
            select: { name: true, profileImage: true, id: true }
        })
    } catch (error) {
        console.error("Error fetching salon name:", error)
        return null
    }
}

export async function getSalonBookingAvailability(salonId: string) {
    await requireSalonOwner(salonId)

    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { allowBookings: true }
    })

    if (!salon) throw new Error("A szalon nem található.")
    return salon.allowBookings
}

export async function setSalonBookingAvailability(salonId: string, allowBookings: boolean) {
    await requireSalonOwner(salonId)

    const salon = await prisma.salon.update({
        where: { id: salonId },
        data: { allowBookings },
        select: {
            allowBookings: true,
            slug: true,
        }
    })

    revalidatePath(`/profile/${salon.slug}`)
    revalidatePath(`/dashboard/salons/${salonId}/bookings`)
    revalidatePath(`/salon/${salonId}/bookings`)

    return salon.allowBookings
}

/**
 * A szolgáltató által szerkeszthető szalonmezők.
 *
 * Szándékosan allowlist és nem denylist: az `UpdateSalonInput` a teljes Prisma
 * update típus, tehát szűrés nélkül a szalon tulajdonosa olyan mezőket is
 * írhatna, mint az `ownerId` (tulajdonjog átírása), `isActive` (lejárat
 * megkerülése), `rating` / `reviewCount` (értékelés hamisítása), `slug` vagy
 * `salonFingerprint` (duplikációellenőrzés megkerülése).
 *
 * Új szerkeszthető mező felvételekor ide is fel kell venni.
 */
const PROVIDER_EDITABLE_SALON_FIELDS = new Set([
    "name",
    "country",
    "city",
    "district",
    "street",
    "houseNumber",
    "floor",
    "door",
    "zipCode",
    "address",
    "categories",
    "currency",
    "description",
    "images",
    "profileImage",
    "coverImage",
    "email",
    "phone",
    "website",
    "languages",
    "lat",
    "lng",
    "ownerName",
    "ownerImage",
    "aboutMe",
    "isTeam",
    "allowMessages",
    "allowBookings",
    "showPhoneOnProfile",
    "showEmailOnProfile",
    "notifyNewMessage",
    "notifyNewBooking",
    "notifyNewReview",
    "notifyNewFavorite",
    "notifyPostLike",
    "notifyPostComment",
    "notifyWeeklyStats",
    "notifyMonthlyStats",
])

export async function updateSalon(salonId: string, data: UpdateSalonInput) {
    const ownerId = await requireSalonOwner(salonId)
    const { teamMembers, ...incomingSalonData } = data;

    // Mass-assignment elleni védelem: a nem engedélyezett mezőket eldobjuk.
    const salonData = Object.fromEntries(
        Object.entries(incomingSalonData).filter(([key]) => PROVIDER_EDITABLE_SALON_FIELDS.has(key))
    );

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Update basic salon data
            const updatedSalon = await tx.salon.update({
                where: { id: salonId },
                data: salonData
            });

            // Update team members if present in data
            if (teamMembers && Array.isArray(teamMembers)) {
                // Remove existing ones
                await tx.teamMember.deleteMany({
                    where: { salonId }
                });

                // Create new ones
                if (teamMembers.length > 0) {
                    await tx.teamMember.createMany({
                        data: teamMembers.map((member, index) => ({
                            salonId,
                            name: member.name,
                            role: member.role || null,
                            description: member.description || null,
                            image: member.image || null,
                            order: index
                        }))
                    });
                }
            }

            return updatedSalon;
        });

        await writeAuditLog({
            action: AUDIT_ACTIONS.UPDATE_SALON,
            userId: ownerId,
            entity: "Salon",
            entityId: salonId,
            metadata: {
                changedFields: Object.keys(salonData),
                teamMembersUpdated: Array.isArray(teamMembers),
            },
            ...(await getAuditActionContext()),
        })

        return result;
    } catch (error) {
        console.error("Error updating salon with team members:", error)
        throw error;
    }
}

/**
 * Publikálja a szalont, ha a házirend engedi és nincs rendszerszintű tiltás.
 * A publishedAt az ELSŐ publikálás időpontja marad, újrapublikálás nem írja felül.
 */
export async function publishSalon(salonId: string) {
    const ownerId = await requireSalonOwner(salonId)

    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { publishedAt: true, publishBlockedReason: true },
    })
    if (!salon) throw new Error("A szalon nem található.")

    if (salon.publishBlockedReason) {
        const reason = salon.publishBlockedReason === "BILLING"
            ? "A szalon publikálása előfizetési okból le van tiltva."
            : "A szalon publikálása adminisztrátori döntés miatt le van tiltva."

        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_PUBLISH_BLOCKED,
            userId: ownerId,
            entity: "Salon",
            entityId: salonId,
            metadata: { blockedReason: salon.publishBlockedReason },
            ...(await getAuditActionContext()),
        })
        return { success: false, error: reason }
    }

    const policy = await canPublishSalon(ownerId, salonId)
    if (!policy.allowed) {
        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_PUBLISH_BLOCKED,
            userId: ownerId,
            entity: "Salon",
            entityId: salonId,
            metadata: { policyReason: policy.reason ?? null },
            ...(await getAuditActionContext()),
        })
        return { success: false, error: policy.reason ?? "A szalon jelenleg nem publikálható." }
    }

    await prisma.salon.update({
        where: { id: salonId },
        data: salon.publishedAt
            ? { isPublished: true }
            : { isPublished: true, publishedAt: new Date() },
    })

    await writeAuditLog({
        action: AUDIT_ACTIONS.SALON_PUBLISH,
        userId: ownerId,
        entity: "Salon",
        entityId: salonId,
        ...(await getAuditActionContext()),
    })

    revalidatePath("/dashboard/salons")
    return { success: true }
}

/**
 * Levonja a szalont a publikus felületről.
 * A publishedAt szándékosan megmarad: az első publikálás időpontja később
 * a statisztikákhoz és a türelmi idő számításához kell.
 */
export async function unpublishSalon(salonId: string) {
    const ownerId = await requireSalonOwner(salonId)

    await prisma.salon.update({
        where: { id: salonId },
        data: { isPublished: false },
    })

    await writeAuditLog({
        action: AUDIT_ACTIONS.SALON_UNPUBLISH,
        userId: ownerId,
        entity: "Salon",
        entityId: salonId,
        ...(await getAuditActionContext()),
    })

    revalidatePath("/dashboard/salons")
    return { success: true }
}

export async function getUserSalons(userId: string) {
    const sessionUserId = await requireSelf(userId)
    try {
        return await prisma.salon.findMany({
            where: { ownerId: sessionUserId },
            include: {
                subscription: {
                    select: {
                        plan: true,
                        status: true,
                        freeExpiresAt: true,
                        currentPeriodEnd: true,
                        cancelAtPeriodEnd: true,
                    }
                }
            }
        })
    } catch (error) {
        console.error("Error fetching user salons:", error)
        throw error
    }
}

// Favorites Actions
export async function toggleFavorite(salonId: string, userId: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) throw new Error("Nincs jogosultságod ezt a műveletet elvégezni.")
    if (!salonId || !userId) {
        throw new Error("Missing salonId or userId")
    }
    try {
        const existing = await prisma.favorite.findUnique({
            where: {
                userId_salonId: {
                    userId,
                    salonId,
                }
            }
        })

        if (existing) {
            await prisma.favorite.delete({
                where: { id: existing.id }
            })
            return { isFavorite: false }
        } else {
            await prisma.favorite.create({
                data: {
                    userId,
                    salonId,
                }
            })
            return { isFavorite: true }
        }
    } catch (error) {
        console.error("Error toggling favorite:", error)
        throw error
    }
}

export async function isSalonFavorite(salonId: string, userId: string) {
    if (!userId || !salonId) return false
    try {
        const favorite = await prisma.favorite.findUnique({
            where: {
                userId_salonId: {
                    userId,
                    salonId,
                }
            }
        })
        return !!favorite
    } catch (error) {
        console.error("Error checking favorite status:", error)
        return false
    }
}

export async function getUserFavorites(userId: string) {
    const sessionUserId = await requireSelf(userId)
    try {
        return await prisma.favorite.findMany({
            where: { userId: sessionUserId },
            include: {
                salon: {
                    include: {
                        services: {
                            select: { price: true }
                        }
                    }
                }
            },
            orderBy: { id: 'desc' }
        })
    } catch (error) {
        console.error("Error fetching user favorites:", error)
        throw error
    }
}
export async function createSalon(data: CreateSalonInput) {
    const sessionUserId = await requireSession()
    if (data.ownerId && data.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod más nevében szalont létrehozni.")
    const salonName = requireNonEmptyText(data.name, "Szalon neve")
    const salonAddress = requireNonEmptyText(data.address, "Cím")
    const salonCurrency = requireNonEmptyText(data.currency, "Pénznem")

    // Duplikáció ellenőrzés fingerprint alapján (globálisan, lejárt szalonokra is)
    const fingerprint = generateSalonFingerprint(data.phone, data.address)
    const dupCheck = await checkFingerprintDuplicate(fingerprint)
    if (dupCheck.duplicate) {
        if (dupCheck.isInactive) {
            throw new Error(
                `Ez a szalon (${dupCheck.salonName}) már regisztrálva van, de az ingyenes időszaka lejárt. Kérjük vegye fel a kapcsolatot az ügyfélszolgálattal.`
            )
        }
        throw new Error(
            `Ez a szalon (${dupCheck.salonName}) már regisztrálva van az oldalon.`
        )
    }

    // Pénznem meghatározása ország alapján (HU → HUF, egyéb → EUR)
    const billingCurrency = (data.country === "Magyarország" || data.country === "Hungary")
        ? "HUF"
        : "EUR"

    try {
        const slug = await generateUniqueSlug(salonName, prisma)
        // A publikálás a házirenden keresztül dől el. Az 1. fázisban ez mindig
        // engedélyez, tehát az új szalon azonnal publikált lesz. A canPublishSalon
        // adatbázist olvas, tehát dobhat — hiba esetén publikálatlanul jön létre a
        // szalon, de a létrehozás maga sosem bukik el a publikálási házirenden.
        let publishPolicy: PublishPolicyResult
        try {
            publishPolicy = await canPublishSalon(data.ownerId ?? sessionUserId)
        } catch (error) {
            console.error("Error checking publish policy:", error)
            publishPolicy = { allowed: false }
        }
        const salon = await prisma.salon.create({
            data: {
                name: salonName,
                slug,
                isPublished: publishPolicy.allowed,
                publishedAt: publishPolicy.allowed ? new Date() : null,
                country: data.country || "Magyarország",
                city: data.city || "",
                district: data.district || null,
                street: data.street || null,
                houseNumber: data.houseNumber || null,
                floor: data.floor || null,
                door: data.door || null,
                zipCode: data.zipCode || null,
                address: salonAddress,
                currency: salonCurrency,
                categories: data.categories ?? data.categoryIds ?? [],
                ownerId: data.ownerId ?? sessionUserId,
                images: data.images || [],
                profileImage: data.profileImage || data.image || null,
                coverImage: data.coverImage || null,
                rating: 0,
                reviewCount: 0,
                languages: data.languages || [],
                lat: data.lat || null,
                lng: data.lng || null,
                phone: data.phone || null,
                email: data.email || null,
                salonFingerprint: fingerprint,
                allowMessages: data.allowMessages ?? true,
                allowBookings: data.allowBookings ?? true,
                showPhoneOnProfile: data.showPhoneOnProfile ?? true,
                showEmailOnProfile: data.showEmailOnProfile ?? false,
                notifyNewMessage: data.notifyNewMessage ?? true,
                notifyNewBooking: data.notifyNewBooking ?? true,
                notifyNewReview: data.notifyNewReview ?? true,
                notifyNewFavorite: data.notifyNewFavorite ?? false,
                notifyPostLike: data.notifyPostLike ?? false,
                notifyPostComment: data.notifyPostComment ?? true,
                notifyWeeklyStats: data.notifyWeeklyStats ?? true,
                notifyMonthlyStats: data.notifyMonthlyStats ?? true,
                ownerName: data.ownerName || null,
                ownerImage: data.ownerImage || null,
                aboutMe: data.aboutMe || null,
                isTeam: data.isTeam ?? false,
                teamMembers: data.teamMembers ? {
                    create: data.teamMembers.map((member, index) => ({
                        name: member.name,
                        role: member.role,
                        description: member.description,
                        image: member.image,
                        order: index
                    }))
                } : undefined
            }
        })

        // FREE Subscription rekord automatikus létrehozása
        await initSubscription(salon.id, billingCurrency as "HUF" | "EUR")

        await writeAuditLog({
            action: AUDIT_ACTIONS.CREATE_SALON,
            userId: sessionUserId,
            entity: "Salon",
            entityId: salon.id,
            metadata: { name: salon.name, slug: salon.slug, city: salon.city, currency: billingCurrency },
            ...(await getAuditActionContext()),
        })

        return salon
    } catch (error) {
        console.error("Error creating salon:", error)
        throw error
    }
}
export async function createService(data: ServiceInput) {
    await requireSalonOwner(data.salonId)
    const name = requireNonEmptyText(data.name, "Szolgáltatás neve")
    const price = requirePositiveNumber(data.price, "Ár")
    const duration = requirePositiveNumber(data.duration, "Időtartam")
    return await prisma.service.create({
        data: {
            name,
            price,
            duration,
            description: data.description,
            salonId: data.salonId
        }
    })
}

export async function updateService(serviceId: string, data: Partial<Omit<ServiceInput, "salonId">>) {
    await requireServiceOwner(serviceId)
    return await prisma.service.update({
        where: { id: serviceId },
        data: {
            ...data,
            name: data.name === undefined ? undefined : requireNonEmptyText(data.name, "Szolgáltatás neve"),
            price: data.price === undefined ? undefined : requirePositiveNumber(data.price, "Ár"),
            duration: data.duration === undefined ? undefined : requirePositiveNumber(data.duration, "Időtartam"),
        }
    })
}

export async function deleteService(serviceId: string) {
    await requireServiceOwner(serviceId)
    return await prisma.service.delete({
        where: { id: serviceId }
    })
}

export async function getAllSalons() {
    try {
        return await prisma.salon.findMany({
            where: { ...PUBLIC_SALON_WHERE }
        })
    } catch (error) {
        console.error("Error fetching all salons:", error)
        return []
    }
}

export async function getFeaturedSalons({
    city,
    services,
    limit = 8,
}: {
    city?: string
    services?: string[]
    limit?: number
}) {
    try {
        const baseWhere: Prisma.SalonWhereInput = { ...PUBLIC_SALON_WHERE }

        if (city) {
            baseWhere.city = { contains: city, mode: "insensitive" }
        }
        if (services && services.length > 0) {
            baseWhere.categories = { hasSome: services }
        }

        const select = {
            id: true,
            name: true,
            slug: true,
            profileImage: true,
            categories: true,
            city: true,
            rating: true,
            subscription: { select: { plan: true } },
        }

        // 1. Prémium szalonok
        const premiumSalons = await prisma.salon.findMany({
            where: { ...baseWhere, subscription: { plan: "PREMIUM" } },
            orderBy: { rating: "desc" },
            take: limit,
            select,
        })

        const remaining = limit - premiumSalons.length
        const mapFeaturedSalon = (salon: (typeof premiumSalons)[number]) => ({
            ...salon,
            subscriptionPlan: salon.subscription?.plan.toLowerCase() ?? "free",
            subscription: undefined,
        })

        if (remaining <= 0) return premiumSalons.map(mapFeaturedSalon)

        // 2. Feltöltés legnépszerűbbekkel
        const excludeIds = premiumSalons.map((s) => s.id)
        const popularSalons = await prisma.salon.findMany({
            where: {
                ...baseWhere,
                OR: [
                    { subscription: null },
                    { subscription: { plan: { not: "PREMIUM" } } },
                ],
                id: { notIn: excludeIds },
            },
            orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
            take: remaining,
            select,
        })

        return [...premiumSalons, ...popularSalons].map(mapFeaturedSalon)
    } catch (error) {
        console.error("Error fetching featured salons:", error)
        return []
    }
}

export async function getRecentSalons(limit = 4) {
    try {
        return await prisma.salon.findMany({
            where: { ...PUBLIC_SALON_WHERE },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                name: true,
                slug: true,
                profileImage: true,
                categories: true,
                city: true,
                rating: true,
            }
        })
    } catch (error) {
        console.error("Error fetching recent salons:", error)
        return []
    }
}

export async function getPublicSalonData(slug: string) {
    try {
        const salon = await prisma.salon.findFirst({
            where: {
                slug,
                ...PUBLIC_SALON_WHERE
            },
            include: {
                services: true,
                openingHours: true,
                posts: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { likes: true, comments: true }
                        }
                    }
                },
                reviews: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { name: true, image: true } }
                    }
                },
                teamMembers: {
                    orderBy: { order: 'asc' }
                }
            }
        })

        if (!salon) return null;

        return {
            ...salon,
            images: displayableImages(salon.images),
            profileImage: isDisplayableImage(salon.profileImage) ? salon.profileImage : null,
            coverImage: isDisplayableImage(salon.coverImage) ? salon.coverImage : null,
            ownerImage: isDisplayableImage(salon.ownerImage) ? salon.ownerImage : null,
            openingHours: salon.openingHours?.map((oh) => ({
                ...oh,
                open: oh.open,
                close: oh.close
            })) || [],
            posts: salon.posts?.map((p) => ({
                id: p.id,
                content: p.content,
                images: displayableImages(p.images),
                createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
                _count: p._count
            })) || [],
            reviews: salon.reviews?.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
                user: r.user
            })) || [],
            teamMembers: salon.teamMembers?.map((member) => ({
                ...member,
                image: isDisplayableImage(member.image) ? member.image : null
            })) || []
        }
    } catch (error) {
        console.error("Error fetching public salon data:", error)
        return null
    }
}

export async function getRecentPosts(page: number = 1, filters: {
    lat?: number;
    lng?: number;
    radius?: number;
    categories?: string[];
} = {}, currentUserId?: string) {
    try {
        const where: Prisma.PostWhereInput = { isActive: true }
        // A nem publikált szalonok posztjai nem jelenhetnek meg a publikus feedben.
        where.salon = { ...PUBLIC_SALON_WHERE }

        if (filters) {
            const salonConditions: Prisma.SalonWhereInput = {}

            if (filters.lat && filters.lng && filters.radius) {
                const radiusInDegrees = filters.radius / 111.32 // 1 degree is approx 111.32km
                const latDelta = radiusInDegrees
                const lngDelta = radiusInDegrees / Math.cos(filters.lat * Math.PI / 180)

                salonConditions.lat = {
                    gte: filters.lat - latDelta,
                    lte: filters.lat + latDelta
                }
                salonConditions.lng = {
                    gte: filters.lng - lngDelta,
                    lte: filters.lng + lngDelta
                }
            }

            if (filters.categories && filters.categories.length > 0) {
                salonConditions.categories = {
                    hasSome: filters.categories
                }
            }

            if (Object.keys(salonConditions).length > 0) {
                // AND szerkezet, NEM spread: így egy jövőbeli szalon-szűrő sem írhatja
                // felül némán a láthatósági feltételeket egy esetleges kulcsütközéskor.
                where.salon = { AND: [PUBLIC_SALON_WHERE, salonConditions] }
            }
        }

        const posts = await prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20,
            skip: (page - 1) * 20,
            include: {
                salon: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        ownerId: true,
                        categories: true,
                        images: true,
                        currency: true,
                        rating: true,
                        reviewCount: true,
                        services: {
                            select: { price: true }
                        },
                        profileImage: true
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                },
                likes: {
                    where: { userId: currentUserId ?? "__anonymous__" },
                    select: { userId: true }
                }
            }
        })
        console.log(`Fetched ${posts.length} posts successfully`)

        // Serialize to plain objects to avoid serialization issues
        return posts.map(p => ({
            id: p.id,
            content: p.content,
            images: displayableImages(p.images),
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
            salon: {
                ...p.salon,
                images: displayableImages(p.salon.images),
                profileImage: isDisplayableImage(p.salon.profileImage) ? p.salon.profileImage : null,
            },
            layout: p.layout || "grid",
            _count: p._count,
            isLiked: p.likes.length > 0
        }))
    } catch (error) {
        console.error("Error fetching recent posts FULL DETAILS:", error)
        return []
    }
}

export async function saveOpeningHours(salonId: string, hours: OpeningHourInput[]) {
    await requireSalonOwner(salonId)
    try {
        await prisma.openingHour.deleteMany({ where: { salonId } })
        await prisma.openingHour.createMany({
            data: hours.map(h => ({
                salonId,
                day: h.day,
                open: h.open || null,
                close: h.close || null,
                isOpen: h.isOpen
            }))
        })
        return await prisma.openingHour.findMany({ where: { salonId } })
    } catch (error) {
        console.error("Error saving opening hours:", error)
        throw error
    }
}

export async function createClosedDate(data: ClosedDateInput) {
    await requireSalonOwner(data.salonId)
    return await prisma.closedDate.create({
        data: {
            salonId: data.salonId,
            date: data.date,
            reason: data.reason
        }
    })
}

export async function deleteClosedDate(id: string) {
    const sessionUserId = await requireSession()
    const closedDate = await prisma.closedDate.findUnique({
        where: { id },
        select: { salon: { select: { ownerId: true } } }
    })
    if (!closedDate) throw new Error("A zárt nap nem található.")
    if (closedDate.salon.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod ehhez a szalonhoz.")
    return await prisma.closedDate.delete({ where: { id } })
}

export async function createPost(data: PostInput) {
    await requireSalonOwner(data.salonId)

    // Poszt limit ellenőrzés
    const postCheck = await canCreatePost(data.salonId)
    if (!postCheck.allowed) {
        throw new Error(postCheck.reason)
    }

    // Videó jogosultság ellenőrzés
    const hasVideos = data.videos && data.videos.length > 0
    if (hasVideos) {
        const videoCheck = await canUploadVideo(data.salonId)
        if (!videoCheck.allowed) {
            throw new Error(videoCheck.reason)
        }
    }

    const post = await prisma.post.create({
        data: {
            salonId: data.salonId,
            content: data.content,
            images: data.images || [],
            videos: data.videos || [],
            layout: data.layout || "grid"
        }
    })

    // FREE csomagnál növeljük a számlálót
    await incrementPostCount(data.salonId)

    return post
}

export async function updatePost(postId: string, data: Partial<Pick<PostInput, "content" | "images" | "layout">>) {
    await requirePostOwner(postId)
    return await prisma.post.update({
        where: { id: postId },
        data
    })
}

export async function deletePost(postId: string) {
    await requirePostOwner(postId)
    return await prisma.post.delete({ where: { id: postId } })
}

// Messaging Actions
export async function sendMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    subject?: string;
    salonId?: string;
}) {
    // 1. Verify Sender matches session
    const sessionUserId = await requireSession()
    if (data.senderId !== sessionUserId) {
        throw new Error("Nem küldhetsz üzenetet más nevében.")
    }

    // 2. Prevent Self-Messaging
    if (data.senderId === data.receiverId) {
        throw new Error("Nem küldhetsz üzenetet magadnak!")
    }
    const content = requireNonEmptyText(data.content, "Üzenet")

    // Szalon-kontextusú üzenet csak látható szalonnak küldhető — kivéve a szalon
    // tulajdonosát, akinek a meglévő ügyfél-beszélgetéseit akkor is kezelnie kell
    // tudnia (pl. válaszolnia), ha a szalon időközben nem publikusan látható.
    if (data.salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: data.salonId },
            select: { ownerId: true, isActive: true, isPublished: true, publishBlockedReason: true },
        })
        const isOwner = salon?.ownerId === sessionUserId
        if (!salon || (!isOwner && !isSalonPubliclyVisible(salon))) {
            throw new Error("Ez a szalon jelenleg nem érhető el.")
        }
    }

    const message = await prisma.message.create({
        data: { ...data, content }
    })

    await writeAuditLog({
        action: AUDIT_ACTIONS.SEND_MESSAGE,
        userId: sessionUserId,
        entity: "Message",
        entityId: message.id,
        metadata: { receiverId: data.receiverId, salonId: data.salonId ?? null },
        ...(await getAuditActionContext()),
    })

    revalidatePath("/dashboard/messages")
    return message
}
export async function getUserMessages(userId: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) throw new Error("Nincs jogosultságod más felhasználó üzeneteit megtekinteni.")
    return await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId },
                { receiverId: userId }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, image: true } },
            receiver: { select: { id: true, name: true, image: true } },
            salon: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function markMessageAsRead(messageId: string) {
    const sessionUserId = await requireSession()
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { receiverId: true }
    })
    if (!message) throw new Error("Az üzenet nem található.")
    if (message.receiverId !== sessionUserId) throw new Error("Nincs jogosultságod ezt az üzenetet olvasottnak jelölni.")
    const updated = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true }
    })
    revalidatePath("/dashboard/messages")
    return updated
}

export async function getAdminUser() {
    try {
        return await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, name: true, image: true }
        })
    } catch (error) {
        console.error("Error fetching admin user:", error)
        return null
    }
}
export async function getUnreadMessageCount(userId: string) {
    const sessionUserId = await requireSelf(userId)
    try {
        const count = await prisma.message.count({
            where: {
                receiverId: sessionUserId,
                isRead: false
            }
        });
        return count;
    } catch (error) {
        console.error("Error getting unread message count:", error);
        return 0;
    }
}


// Social Actions (Likes/Comments)
export async function toggleLike(postId: string, userId: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) throw new Error("Nincs jogosultságod ezt a műveletet elvégezni.")
    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: { userId, postId }
        }
    })

    let result;
    if (existingLike) {
        result = await prisma.like.delete({
            where: { id: existingLike.id }
        })
    } else {
        result = await prisma.like.create({
            data: { userId, postId }
        })
    }

    revalidatePath("/")
    revalidatePath("/profile/me")
    return result
}

export async function addComment(postId: string, userId: string, content: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) throw new Error("Nincs jogosultságod kommentelni más nevében.")
    const cleanContent = requireNonEmptyText(content, "Komment")
    const comment = await prisma.comment.create({
        data: { postId, userId, content: cleanContent }
    })
    revalidatePath("/")
    revalidatePath("/profile/me")
    return comment
}

export async function getPostComments(postId: string) {
    return await prisma.comment.findMany({
        where: { postId },
        include: {
            user: { select: { id: true, name: true, image: true } }
        },
        orderBy: { createdAt: 'asc' }
    })
}

// Booking Actions (Skeleton)
export async function getMyBookings() {
    const sessionUserId = await requireSession()

    return await prisma.booking.findMany({
        where: { userId: sessionUserId },
        select: {
            id: true,
            date: true,
            time: true,
            status: true,
            salon: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
            service: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { date: "asc" },
            { time: "asc" },
        ],
    })
}

export async function cancelMyBooking(bookingId: string) {
    const sessionUserId = await requireSession()
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            status: true,
            date: true,
            time: true,
            userId: true,
            salonId: true,
            salon: { select: { ownerId: true } },
            service: { select: { name: true } },
        },
    })

    if (!booking) throw new Error("A foglalási kérés nem található.")
    if (booking.userId !== sessionUserId) {
        throw new Error("Nincs jogosultságod ehhez a foglaláshoz.")
    }

    const cancellationCheck = canCancelMyBooking(booking.status)
    if (!cancellationCheck.allowed) throw new Error(cancellationCheck.error)

    const cancellationMessage = formatBookingVisitorCancellationMessage({
        serviceName: booking.service.name,
        date: booking.date,
        time: booking.time,
    })

    const updated = await prisma.$transaction(async (tx) => {
        const statusUpdate = await tx.booking.updateMany({
            where: {
                id: bookingId,
                userId: sessionUserId,
                status: "pending",
            },
            data: { status: "cancelled" },
        })

        if (statusUpdate.count !== 1) {
            throw new Error(cancellationCheck.error)
        }

        const updatedBooking = await tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: {
                id: true,
                date: true,
                time: true,
                status: true,
                salon: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        await tx.message.create({
            data: {
                senderId: sessionUserId,
                receiverId: booking.salon.ownerId,
                salonId: booking.salonId,
                subject: cancellationMessage.subject,
                content: cancellationMessage.content,
            },
        })

        return updatedBooking
    })

    revalidatePath("/dashboard/bookings")
    revalidatePath("/dashboard")
    revalidatePath(`/salon/${booking.salonId}`)
    return updated
}

export async function getSalonBookingRequests(salonId: string) {
    await requireSalonOwner(salonId)

    return await prisma.booking.findMany({
        where: { salonId },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            service: { select: { id: true, name: true, price: true, duration: true } },
        },
        orderBy: [
            { createdAt: "desc" },
            { date: "asc" },
            { time: "asc" },
        ],
    })
}

async function updateOwnedBookingStatus(bookingId: string, nextStatus: "confirmed" | "cancelled") {
    const sessionUserId = await requireSession()
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            status: true,
            date: true,
            time: true,
            userId: true,
            salonId: true,
            salon: { select: { ownerId: true, name: true } },
            service: { select: { name: true } },
        },
    })

    if (!booking) throw new Error("A foglalási kérés nem található.")
    if (booking.salon.ownerId !== sessionUserId) {
        throw new Error("Nincs jogosultságod ehhez a foglalási kéréshez.")
    }

    const transitionCheck = canHandleBookingRequest(booking.status)
    if (!transitionCheck.allowed) throw new Error(transitionCheck.error)

    if (nextStatus === "confirmed") {
        const existingConfirmedBooking = await prisma.booking.findFirst({
            where: {
                id: { not: booking.id },
                salonId: booking.salonId,
                date: booking.date,
                time: booking.time,
                status: "confirmed",
            },
            select: { id: true },
        })

        const acceptCheck = canAcceptBookingRequest({
            status: booking.status,
            hasConfirmedConflict: Boolean(existingConfirmedBooking),
        })
        if (!acceptCheck.allowed) throw new Error(acceptCheck.error)
    }

    const decisionMessage = formatBookingDecisionMessage({
        decision: nextStatus === "confirmed" ? "accepted" : "rejected",
        salonName: booking.salon.name,
        serviceName: booking.service.name,
        date: booking.date,
        time: booking.time,
    })

    const updated = await prisma.$transaction(async (tx) => {
        const statusUpdate = await tx.booking.updateMany({
            where: {
                id: bookingId,
                salonId: booking.salonId,
                status: "pending",
            },
            data: { status: nextStatus },
        })

        if (statusUpdate.count !== 1) {
            throw new Error(transitionCheck.error)
        }

        const updatedBooking = await tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                service: { select: { id: true, name: true, price: true, duration: true } },
            },
        })

        await tx.message.create({
            data: {
                senderId: sessionUserId,
                receiverId: booking.userId,
                salonId: booking.salonId,
                subject: decisionMessage.subject,
                content: decisionMessage.content,
            },
        })

        return updatedBooking
    })

    revalidatePath(`/salon/${booking.salonId}`)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/bookings")
    return updated
}

export async function acceptBookingRequest(bookingId: string) {
    return updateOwnedBookingStatus(bookingId, "confirmed")
}

export async function rejectBookingRequest(bookingId: string) {
    return updateOwnedBookingStatus(bookingId, "cancelled")
}

export async function createBooking(data: BookingInput) {
    const sessionUserId = await requireSession()
    if (data.userId !== sessionUserId) throw new Error("Nincs jogosultságod más nevében foglalást létrehozni.")
    const fieldCheck = validateBookingRequestFields(data)
    if (!fieldCheck.allowed) throw new Error(fieldCheck.error)

    const salon = await prisma.salon.findUnique({
        where: { id: data.salonId },
        select: {
            id: true,
            ownerId: true,
            isActive: true,
            isPublished: true,
            publishBlockedReason: true,
            allowBookings: true,
        }
    })

    if (!salon) throw new Error("A szalon nem található.")
    if (!isSalonPubliclyVisible(salon)) throw new Error("Ez a szalon jelenleg nem érhető el.")
    if (!salon.allowBookings) throw new Error("Ez a szalon jelenleg nem fogad foglalásokat.")
    if (salon.ownerId === sessionUserId) throw new Error("Saját szalonodhoz nem hozhatsz létre foglalást.")

    const service = await prisma.service.findFirst({
        where: {
            id: data.serviceId,
            salonId: data.salonId,
        },
        select: { id: true }
    })

    if (!service) throw new Error("A kiválasztott szolgáltatás nem ehhez a szalonhoz tartozik.")

    const bookingDate = new Date(data.date)
    const existingPendingBooking = await prisma.booking.findFirst({
        where: {
            userId: sessionUserId,
            salonId: data.salonId,
            serviceId: data.serviceId,
            date: bookingDate,
            time: data.time,
            status: "pending",
        },
        select: { id: true }
    })

    if (existingPendingBooking) {
        throw new Error("Már van egy függőben lévő foglalási kérésed erre az időpontra.")
    }
    return await prisma.booking.create({
        data: {
            date: bookingDate,
            time: data.time,
            userId: sessionUserId,
            salonId: data.salonId,
            serviceId: data.serviceId,
            status: "pending"
        }
    })
}
export async function createReview(data: {
    salonId: string;
    userId: string;
    rating: number;
    comment: string;
}) {
    const sessionUserId = await requireSession()
    if (data.userId !== sessionUserId) throw new Error("Nincs jogosultságod más nevében értékelést írni.")
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
        throw new Error("Az értékelés 1 és 5 közötti egész szám lehet.")
    }
    const comment = requireNonEmptyText(data.comment, "Értékelés szövege")
    try {
        const review = await prisma.review.create({
            data: {
                salonId: data.salonId,
                userId: data.userId,
                rating: data.rating,
                comment,
            },
        })

        // Update salon's average rating and review count
        const allReviews = await prisma.review.findMany({
            where: { salonId: data.salonId },
            select: { rating: true }
        })

        const reviewCount = allReviews.length
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0)
        const averageRating = totalRating / reviewCount

        await prisma.salon.update({
            where: { id: data.salonId },
            data: {
                rating: averageRating,
                reviewCount: reviewCount,
            }
        })

        const salonForRevalidate = await prisma.salon.findUnique({
            where: { id: data.salonId },
            select: { slug: true },
        })
        if (salonForRevalidate?.slug) {
            revalidatePath(`/profile/${salonForRevalidate.slug}`)
        }
        return review
    } catch (error) {
        console.error("Error creating review:", error)
        throw error
    }
}

/** A bejelentkezett szolgáltató kvóta-állapota a szalonlista fejlécéhez. */
export async function getMyQuotaStatus() {
    const sessionUserId = await requireSession()
    try {
        return await getSalonQuotaStatus(sessionUserId)
    } catch (error) {
        // A felület inkább ne mutasson semmit, mint pontatlan keretet.
        console.error("Kvóta-állapot lekérdezési hiba:", error)
        return null
    }
}
