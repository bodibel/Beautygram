"use server"


import { revalidatePath } from "next/cache"
import prisma from "@/lib/db"
import { generateUniqueSlug } from "@/lib/slug"
import { Salon, Service, OpeningHour, ClosedDate, Post } from "@/lib/salon-types"
import { requireSession } from "@/lib/auth-utils"
import { writeAuditLog } from "@/lib/audit-log"
import {
  generateSalonFingerprint,
  checkFingerprintDuplicate,
  initSubscription,
  canCreatePost,
  incrementPostCount,
  canUploadVideo,
} from "@/lib/subscription"

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
    try {
        const sessionUserId = await requireSession()
        if (sessionUserId !== userId) {
            return null
        }

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

        if (!salon || salon.ownerId !== userId) {
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

export async function updateSalon(salonId: string, data: any) {
    const sessionUserId = await requireSalonOwner(salonId)
    const { teamMembers, ...incomingSalonData } = data;

    const editableSalonFields = new Set([
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

    const salonData = Object.fromEntries(
        Object.entries(incomingSalonData).filter(([key]) => editableSalonFields.has(key))
    );

    try {
        const updatedSalon = await prisma.$transaction(async (tx) => {
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
                        data: teamMembers.map((member: any, index: number) => ({
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
            action: "UPDATE_SALON",
            userId: sessionUserId,
            entity: "SALON",
            entityId: salonId,
            metadata: {
                salonId,
                updatedFields: Object.keys(salonData)
            }
        })

        return updatedSalon
    } catch (error) {
        console.error("Error updating salon with team members:", error)
        throw error;
    }
}
export async function getUserSalons(userId: string) {
    try {
        const sessionUserId = await requireSession()
        if (sessionUserId !== userId) throw new Error("Nincs jogosultságod más felhasználó szalonjait megtekinteni.")

        return await prisma.salon.findMany({
            where: { ownerId: userId },
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
    try {
        const sessionUserId = await requireSession()
        if (sessionUserId !== userId) throw new Error("Nincs jogosultságod más felhasználó kedvenceit megtekinteni.")

        return await prisma.favorite.findMany({
            where: { userId },
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
export async function createSalon(data: any) {
    const sessionUserId = await requireSession()
    if (data.ownerId !== sessionUserId) throw new Error("Nincs jogosultságod más nevében szalont létrehozni.")

    // Duplikáció ellenőrzés fingerprint alapján (globálisan, lejárt szalonokra is)
    const existingSalonCount = await prisma.salon.count({
        where: { ownerId: sessionUserId }
    })
    if (existingSalonCount > 0) {
        throw new Error("Az MVP verziÃ³ban jelenleg egy felhasznÃ¡lÃ³ csak egy szalont hozhat lÃ©tre.")
    }

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
        const slug = await generateUniqueSlug(data.name, prisma)
        const salon = await prisma.salon.create({
            data: {
                name: data.name,
                slug,
                country: data.country || "Magyarország",
                city: data.city,
                district: data.district || null,
                street: data.street || null,
                houseNumber: data.houseNumber || null,
                floor: data.floor || null,
                door: data.door || null,
                zipCode: data.zipCode || null,
                address: data.address,
                currency: data.currency,
                categories: data.categories,
                ownerId: data.ownerId,
                images: data.images || [],
                profileImage: data.profileImage || null,
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
                    create: data.teamMembers.map((member: any, index: number) => ({
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
        await prisma.user.update({
            where: { id: sessionUserId },
            data: { role: "provider" }
        })

        await writeAuditLog({
            action: "CREATE_SALON",
            userId: sessionUserId,
            entity: "SALON",
            entityId: salon.id,
            metadata: {
                salonId: salon.id,
                name: salon.name,
                city: salon.city
            }
        })

        return salon
    } catch (error) {
        console.error("Error creating salon:", error)
        throw error
    }
}
export async function createService(data: any) {
    await requireSalonOwner(data.salonId)
    return await prisma.service.create({
        data: {
            name: data.name,
            price: String(data.price),
            duration: String(data.duration),
            description: data.description,
            salonId: data.salonId
        }
    })
}

export async function updateService(serviceId: string, data: any) {
    await requireServiceOwner(serviceId)
    return await prisma.service.update({
        where: { id: serviceId },
        data
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
            where: { isActive: true }
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
        const baseWhere: any = { isActive: true }

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
        }

        // 1. Prémium szalonok
        const premiumSalons = await prisma.salon.findMany({
            where: baseWhere,
            orderBy: [{ reviewCount: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
            take: limit,
            select,
        })

        const remaining = limit - premiumSalons.length
        if (remaining <= 0) return premiumSalons

        // 2. Feltöltés legnépszerűbbekkel
        const excludeIds = premiumSalons.map((s) => s.id)
        const popularSalons = await prisma.salon.findMany({
            where: {
                ...baseWhere,
                id: { notIn: excludeIds },
            },
            orderBy: [{ reviewCount: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
            take: remaining,
            select,
        })

        return [...premiumSalons, ...popularSalons]
    } catch (error) {
        console.error("Error fetching featured salons:", error)
        return []
    }
}

export async function getRecentSalons(limit = 4) {
    try {
        return await prisma.salon.findMany({
            where: { isActive: true },
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
        const identifier = slug?.trim()
        if (!identifier) return null

        const salon = await prisma.salon.findFirst({
            where: {
                isActive: true,
                OR: [
                    { slug: identifier },
                    { id: identifier },
                ],
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

        const s = salon as any;

        // Serialize complex objects (Dates, Decimals) to plain JSON
        return {
            ...s,
            openingHours: s.openingHours?.map((oh: any) => ({
                ...oh,
                open: oh.open,
                close: oh.close
            })) || [],
            posts: s.posts?.map((p: any) => ({
                id: p.id,
                content: p.content,
                images: p.images,
                createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
                _count: p._count
            })) || [],
            reviews: s.reviews?.map((r: any) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
                user: r.user
            })) || [],
            teamMembers: s.teamMembers || []
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
    minRating?: number | null;
    searchQuery?: string;
} = {}, currentUserId?: string) {
    try {
        const where: any = { isActive: true }
        const salonConditions: any = {}

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

        if (filters.minRating) {
            salonConditions.rating = {
                gte: filters.minRating
            }
        }

        if (Object.keys(salonConditions).length > 0) {
            where.salon = salonConditions
        }

        if (filters.searchQuery?.trim()) {
            const searchQuery = filters.searchQuery.trim()
            where.OR = [
                {
                    content: {
                        contains: searchQuery,
                        mode: "insensitive"
                    }
                },
                {
                    salon: {
                        name: {
                            contains: searchQuery,
                            mode: "insensitive"
                        }
                    }
                }
            ]
        }

        const posts = await prisma.post.findMany({
            where,
            orderBy: [
                { createdAt: 'desc' },
                { salon: { rating: 'desc' } },
                { salon: { reviewCount: 'desc' } }
            ],
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
                likes: currentUserId ? {
                    where: { userId: currentUserId },
                    select: { userId: true }
                } : false
            }
        })
        console.log(`Fetched ${posts.length} posts successfully`)

        // Serialize to plain objects to avoid serialization issues
        return posts.map(p => ({
            id: p.id,
            content: p.content,
            images: p.images,
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
            salon: p.salon,
            layout: (p as any).layout || "grid",
            _count: p._count,
            isLiked: (p as any).likes?.length > 0
        }))
    } catch (error) {
        console.error("Error fetching recent posts FULL DETAILS:", error)
        return []
    }
}

export async function saveOpeningHours(salonId: string, hours: any[]) {
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

export async function createClosedDate(data: any) {
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

export async function createPost(data: any) {
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

export async function updatePost(postId: string, data: any) {
    await requirePostOwner(postId)
    return await prisma.post.update({
        where: { id: postId },
        data: {
            content: data.content,
            images: data.images,
            layout: data.layout
        } as any
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

    if (data.salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: data.salonId },
            select: { ownerId: true, allowMessages: true }
        })

        if (!salon) {
            throw new Error("A szalon nem talÃ¡lhatÃ³.")
        }

        if (salon.ownerId !== data.receiverId) {
            throw new Error("Az Ã¼zenet cÃ­mzettje nem egyezik a szalon tulajdonosÃ¡val.")
        }

        if (!salon.allowMessages) {
            throw new Error("Ez a szalon jelenleg nem fogad Ã¼zeneteket.")
        }
    }

    const message = await prisma.message.create({
        data
    })

    await writeAuditLog({
        action: "SEND_MESSAGE",
        userId: sessionUserId,
        entity: "MESSAGE",
        entityId: message.id,
        metadata: {
            receiverId: data.receiverId,
            salonId: data.salonId ?? null,
            subject: data.subject ?? null
        }
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

export async function getSalonMessages(salonId: string) {
    await requireSalonOwner(salonId)

    return await prisma.message.findMany({
        where: { salonId },
        include: {
            sender: { select: { id: true, name: true, image: true } },
            receiver: { select: { id: true, name: true, image: true } },
            salon: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
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
    try {
        const sessionUserId = await requireSession()
        if (sessionUserId !== userId) throw new Error("Nincs jogosultságod más felhasználó üzenetszámát megtekinteni.")

        const count = await prisma.message.count({
            where: {
                receiverId: userId,
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
    const comment = await prisma.comment.create({
        data: { postId, userId, content }
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
export async function createBooking(data: any) {
    const sessionUserId = await requireSession()

    if (data.userId !== sessionUserId) {
        throw new Error("Nincs jogosultsagod mas neveben idopontkerest letrehozni.")
    }

    const salon = await prisma.salon.findUnique({
        where: { id: data.salonId },
        select: { allowBookings: true, ownerId: true }
    })

    if (!salon) {
        throw new Error("A szalon nem talalhato.")
    }

    if (!salon.allowBookings) {
        throw new Error("Ez a szalon jelenleg nem fogad idopontkereseket.")
    }

    if (!data.serviceId) {
        throw new Error("Az idopontkereshez valassz ki egy szolgaltatast.")
    }

    const selectedService = await prisma.service.findUnique({
        where: { id: data.serviceId },
        select: { id: true, salonId: true, name: true }
    })

    if (!selectedService) {
        throw new Error("A kivalasztott szolgaltatas nem talalhato.")
    }

    if (selectedService.salonId !== data.salonId) {
        throw new Error("A kivalasztott szolgaltatas nem ehhez a szalonhoz tartozik.")
    }

    const normalizedMessage = data.message?.trim() || null

    const booking = await prisma.$transaction(async (tx) => {
        const createdBooking = await tx.booking.create({
            data: {
                date: new Date(data.date),
                time: data.time || "Idopont egyeztetes szukseges",
                userId: data.userId,
                salonId: data.salonId,
                serviceId: selectedService.id,
                status: "pending"
            }
        })

        if (normalizedMessage) {
            await tx.message.create({
                data: {
                    senderId: sessionUserId,
                    receiverId: salon.ownerId,
                    salonId: data.salonId,
                    subject: `APPOINTMENT_REQUEST:${createdBooking.id}`,
                    content: normalizedMessage
                }
            })
        }

        return createdBooking
    })

    await writeAuditLog({
        action: "CREATE_BOOKING_REQUEST",
        userId: sessionUserId,
        entity: "BOOKING",
        entityId: booking.id,
        metadata: {
            salonId: data.salonId,
            serviceId: selectedService.id,
            requestedServiceName: selectedService.name,
            message: normalizedMessage
        }
    })

    return booking
}

export async function getSalonBookingRequests(salonId: string) {
    await requireSalonOwner(salonId)

    const bookings = await prisma.booking.findMany({
        where: { salonId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            service: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: { createdAt: "desc" },
        take: 50
    })

    const bookingIds = bookings.map((booking) => booking.id)
    const bookingAuditLogs = bookingIds.length > 0
        ? await prisma.auditLog.findMany({
            where: {
                action: "CREATE_BOOKING_REQUEST",
                entityId: {
                    in: bookingIds
                }
            },
            select: {
                entityId: true,
                metadata: true
            }
        })
        : []
    const requestMessages = bookingIds.length > 0
        ? await prisma.message.findMany({
            where: {
                salonId,
                subject: {
                    startsWith: "APPOINTMENT_REQUEST:"
                }
            },
            select: {
                subject: true,
                content: true
            }
        })
        : []

    const auditMetadataByBookingId = new Map<string, any>()
    for (const log of bookingAuditLogs) {
        if (log.entityId) {
            auditMetadataByBookingId.set(log.entityId, log.metadata)
        }
    }

    const messageByBookingId = new Map<string, string>()
    for (const message of requestMessages) {
        const bookingId = message.subject?.replace("APPOINTMENT_REQUEST:", "")
        if (bookingId && bookingIds.includes(bookingId) && !messageByBookingId.has(bookingId)) {
            messageByBookingId.set(bookingId, message.content)
        }
    }

    return bookings.map((booking) => {
        const auditMetadata = auditMetadataByBookingId.get(booking.id) as any

        return {
            id: booking.id,
            status: booking.status,
            date: booking.date,
            createdAt: booking.createdAt,
            userId: booking.userId,
            userName: booking.user?.name || null,
            serviceId: booking.serviceId,
            serviceName: auditMetadata?.requestedServiceName || booking.service?.name || null,
            message: messageByBookingId.get(booking.id) || auditMetadata?.message || null
        }
    })
}

export async function getCurrentUserBookings() {
    const sessionUserId = await requireSession()

    return await prisma.booking.findMany({
        where: { userId: sessionUserId },
        include: {
            salon: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    city: true,
                    profileImage: true,
                    images: true
                }
            },
            service: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: { createdAt: "desc" },
        take: 50
    })
}

async function updateBookingRequestStatus(bookingId: string, status: "accepted" | "rejected") {
    const sessionUserId = await requireSession()

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            status: true,
            salon: {
                select: {
                    ownerId: true
                }
            }
        }
    })

    if (!booking) {
        throw new Error("Az idopontkeres nem talalhato.")
    }

    if (booking.salon.ownerId !== sessionUserId) {
        throw new Error("Nincs jogosultsagod ehhez az idopontkereshez.")
    }

    if (booking.status !== "pending") {
        throw new Error("Ez az idopontkeres mar el lett biralva.")
    }

    return await prisma.booking.update({
        where: { id: bookingId },
        data: { status }
    })
}

export async function acceptBookingRequest(bookingId: string) {
    return await updateBookingRequestStatus(bookingId, "accepted")
}

export async function rejectBookingRequest(bookingId: string) {
    return await updateBookingRequestStatus(bookingId, "rejected")
}

export async function createReview(data: {
    salonId: string;
    userId: string;
    rating: number;
    comment: string;
}) {
    const sessionUserId = await requireSession()
    if (data.userId !== sessionUserId) throw new Error("Nincs jogosultságod más nevében értékelést írni.")
    try {
        const review = await prisma.review.create({
            data: {
                salonId: data.salonId,
                userId: data.userId,
                rating: data.rating,
                comment: data.comment,
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

