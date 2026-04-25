"use client"

import { useState, use, useEffect } from "react"
import Image from "next/image"
import { MainLayout } from "@/components/layout/main-layout"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { FeedCard } from "@/components/home/feed-card"
import { Card, CardContent } from "@/components/ui/card"
import { getPublicSalonData } from "@/lib/actions/salon"
import { Star, X, Maximize2, Plus, ImagePlus, MapPin, MessageCircle } from "lucide-react"
import { MessageModal } from "@/components/salon/message-modal"
import { useAuth } from "@/lib/auth-context"
import { PostModal } from "@/components/salon/modals/PostModal"
import { createPost, updatePost, deletePost, toggleLike, createReview } from "@/lib/actions/salon"
import { ReviewModal } from "@/components/profile/ReviewModal"
import { AppointmentRequestModal } from "@/components/profile/AppointmentRequestModal"
import { useSalonProfile } from "@/lib/salon-profile-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { normalizeImageList, normalizeImageSrc } from "@/lib/image-utils"
import { PageErrorBoundary } from "@/components/ui/page-error-boundary"
import { FavoriteButton } from "@/components/salon/FavoriteButton"

export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { userData } = useAuth()
    const { slug } = use(params)
    const [activeTab, setActiveTab] = useState("posts")
    const [salon, setSalon] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    const salonProfileCtx = useSalonProfile()

    // Post Management States
    const [isPostModalOpen, setIsPostModalOpen] = useState(false)
    const [editingPost, setEditingPost] = useState<any>(null)

    // Review State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

    // Listen for message modal trigger from sidebar button
    useEffect(() => {
        const handler = () => setIsMessageModalOpen(true)
        window.addEventListener("open-message-modal", handler)
        return () => window.removeEventListener("open-message-modal", handler)
    }, [])

    const handleSavePost = async (content: string, imageUrls: string[], layout: string) => {
        if (!salon) return
        try {
            if (editingPost) {
                await updatePost(editingPost.id, { content, images: imageUrls, layout })
                setSalon({
                    ...salon,
                    posts: (Array.isArray(salon.posts) ? salon.posts : []).map((p: any) => p.id === editingPost.id ? { ...p, content, images: imageUrls, layout } : p)
                })
                toast.success("Bejegyzés frissítve!")
            } else {
                const newPost = await createPost({
                    salonId: salon.id,
                    content,
                    images: imageUrls,
                    layout
                })
                setSalon({
                    ...salon,
                    posts: [newPost, ...(Array.isArray(salon.posts) ? salon.posts : [])]
                })
                toast.success("Bejegyzés létrehozva!")
            }
            setIsPostModalOpen(false)
            setEditingPost(null)
        } catch (error) {
            console.error("Error saving post:", error)
            toast.error("Hiba történt a mentés során!")
        }
    }

    const handleToggleLike = async (postId: string) => {
        if (!userData) {
            toast.error("Be kell jelentkezned a kedveléshez!")
            return
        }
        try {
            await toggleLike(postId, userData.id)
        } catch (error) {
            console.error("Error toggling like:", error)
            toast.error("Hiba történt!")
        }
    }

    const handleEditPost = (post: any) => {
        setEditingPost(post)
        setIsPostModalOpen(true)
    }

    useEffect(() => {
        loadSalonData()
    }, [slug])

    const loadSalonData = async () => {
        try {
            setLoading(true)
            const data = await getPublicSalonData(slug)
            setSalon(data || null)
        } catch (error) {
            console.error("Error loading salon data:", error)
            setSalon(null)
        } finally {
            setLoading(false)
        }
    }

    // Sync salon data into the global SalonProfileContext (powers the left sidebar)
    useEffect(() => {
        if (salon && salonProfileCtx) {
            const reviews = Array.isArray(salon.reviews) ? salon.reviews : []
            const derivedReviewCount = reviews.length
            const derivedRating = derivedReviewCount > 0
                ? reviews.reduce((sum: number, review: any) => sum + (Number(review?.rating) || 0), 0) / derivedReviewCount
                : 0

            salonProfileCtx.setSalonProfile({
                id: salon.id,
                name: salon.name,
                avatar: normalizeImageSrc(salon.profileImage) || normalizeImageList(salon.images)[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
                categories: salon.categories || [],
                rating: derivedRating || Number(salon.rating) || 0,
                reviewCount: derivedReviewCount || Number(salon.reviewCount) || 0,
                city: salon.city,
                district: salon.district,
                ownerId: salon.ownerId,
            })
        }
    }, [salon])

    // Clear the salon profile context when navigating away from this page
    useEffect(() => {
        return () => {
            salonProfileCtx?.setSalonProfile(null)
        }
    }, [])

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <p className="text-gray-400 font-medium">Profil betöltése...</p>
                </div>
            </MainLayout>
        )
    }

    if (!salon) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">A profil nem található</h1>
                    <p className="max-w-md text-sm text-gray-500">
                        Ez a szalonprofil hiányzik, vagy nem tartalmaz elég adatot a biztonságos megjelenítéshez.
                    </p>
                </div>
            </MainLayout>
        )
    }

    const salonPosts = Array.isArray(salon.posts) ? salon.posts : []
    const salonServices = Array.isArray(salon.services) ? salon.services : []
    const salonReviews = Array.isArray(salon.reviews) ? salon.reviews : []
    const salonTeamMembers = Array.isArray(salon.teamMembers) ? salon.teamMembers : []
    const derivedReviewCount = salonReviews.length
    const derivedRating = derivedReviewCount > 0
        ? salonReviews.reduce((sum: number, review: any) => sum + (Number(review?.rating) || 0), 0) / derivedReviewCount
        : 0
    const salonRating = derivedRating || Number(salon.rating) || 0
    const salonReviewCount = derivedReviewCount || Number(salon.reviewCount) || 0
    const normalizedSalonImages = normalizeImageList(salon.images)
    const coverImage = normalizeImageSrc(salon.coverImage) || normalizedSalonImages[0] || "https://images.unsplash.com/photo-1521590832896-7bbc16635175?w=1200&q=80"
    const avatar = normalizeImageSrc(salon.profileImage) || normalizedSalonImages[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"
    const isOwner = userData?.id === salon?.ownerId

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <PageErrorBoundary
                title="A profiloldal nem tudott teljesen betöltődni"
                description="A szalon egy része hibás vagy hiányos adatot tartalmaz. A többi tartalom biztonságosan megjelenik."
            >
            <div className="pb-20 md:pr-6">
                {/* ── Cover Image ── */}
                <div className="relative -mx-4 mt-2 h-[17rem] w-[calc(100%+2rem)] overflow-hidden shadow-sm sm:mx-0 sm:w-full sm:rounded-2xl md:h-[21.5rem]">
                    <Image
                        src={coverImage}
                        alt={`${salon.name} cover`}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                <div className="mt-4 lg:hidden">
                    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                                <Image src={avatar} alt={salon.name} fill className="object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate text-base font-bold text-foreground">{salon.name}</h2>
                                <div className="mt-1 flex items-center gap-1.5 text-sm">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{salonRating.toFixed(1)}</span>
                                    <span className="text-muted-foreground">({salonReviewCount})</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">
                                        {salon.city}
                                        {salon.district ? `, ${salon.district}` : ""}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {Array.isArray(salon.categories) && salon.categories.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {salon.categories.map((category: string, index: number) => (
                                    <span
                                        key={`${category}-${index}`}
                                        className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                    >
                                        {category}
                                    </span>
                                ))}
                            </div>
                        )}
                        {!isOwner && (
                            <div className="mt-4 space-y-2">
                                <Button
                                    className="w-full rounded-xl font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
                                    disabled
                                    title="Hamarosan elérhető!"
                                >
                                    Időpontfoglalás
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl gap-2 font-semibold"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent("open-message-modal"))
                                    }}
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Üzenet küldése
                                </Button>
                                <div className="flex justify-center pt-1">
                                    <FavoriteButton
                                        salonId={salon.id}
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="sticky top-[64px] z-30 mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <ProfileTabs activeTab={activeTab} onChange={setActiveTab} isTeam={salon.isTeam} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {activeTab === "posts" && (
                            <div className="space-y-8">
                                {/* Add New Post for Owner */}
                                {isOwner && (
                                    <Card
                                        className="border-2 border-dashed border-gray-100 hover:border-primary/30 transition-all cursor-pointer group bg-gray-50/30 overflow-hidden rounded-3xl"
                                        onClick={() => {
                                            setEditingPost(null)
                                            setIsPostModalOpen(true)
                                        }}
                                    >
                                        <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
                                            <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <ImagePlus className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="font-bold text-gray-900">Új bejegyzés hozzáadása</h3>
                                                <p className="text-gray-400 text-sm mt-1">Oszd meg a legújabb munkáidat vagy híreidet!</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-primary font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm">
                                                <Plus className="h-4 w-4" />
                                                Létrehozás
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {salonPosts.length > 0 ? (
                                    salonPosts.map((post: any) => (
                                        <FeedCard
                                            key={post.id}
                                            isOwner={isOwner}
                                            onEdit={handleEditPost}
                                            post={{
                                                id: post.id,
                                                author: {
                                                    id: salon.id,
                                                    name: salon.name,
                                                    avatar,
                                                    role: salon.categories?.[0] || "Beauty Salon",
                                                    slug: salon.slug
                                                },
                                                images: normalizeImageList(post.images),
                                                layout: post.layout,
                                                content: post.content,
                                                likes: post._count?.likes || 0,
                                                comments: post._count?.comments || 0,
                                                isLiked: post.likes?.some((l: any) => l.userId === userData?.id),
                                                createdAt: new Date(post.createdAt)
                                            }}
                                            onLike={handleToggleLike}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-400 italic">Még nincsenek bejegyzések.</div>
                                )}
                            </div>
                        )}

                        {activeTab === "services" && (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                {salonServices.length > 0 ? salonServices.map((service: any, index: number) => (
                                    <div key={index} className="flex flex-col gap-3 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{service.duration}</p>
                                        </div>
                                        <div className="w-fit shrink-0 rounded-full bg-accent px-3 py-1 font-bold text-primary">
                                            {service.price} {salon.currency}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-gray-400 italic">Még nincsenek szolgáltatások megadva.</div>
                                )}
                            </div>
                        )}

                        {activeTab === "gallery" && (
                            <div>
                                {normalizedSalonImages.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {normalizedSalonImages.map((img: string, index: number) => (
                                            <div
                                                key={index}
                                                className="aspect-square relative group cursor-pointer overflow-hidden rounded-xl bg-gray-100"
                                                onClick={() => setLightboxImage(img)}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`Gallery ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <Maximize2 className="text-white h-6 w-6" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        Nincsenek feltöltött képek a galériában.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "reviews" && (
                            <div className="space-y-10">
                                {/* Ratings Summary Card */}
                                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                                    <div className="flex flex-col md:flex-row items-center gap-10">
                                        <div className="text-center md:border-r border-gray-100 md:pr-10">
                                            <div className="text-6xl font-black text-gray-900 mb-2">
                                                {salonRating.toFixed(1)}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={cn(
                                                            "h-5 w-5",
                                                            salonRating >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                {salon.reviewCount || 0} Értékelés
                                            </div>
                                        </div>

                                        <div className="flex-1 w-full space-y-2">
                                            {[5, 4, 3, 2, 1].map((rating) => {
                                                const count = salonReviews.filter((r: any) => r?.rating === rating).length || 0;
                                                const percentage = salonReviewCount > 0 ? (count / salonReviewCount) * 100 : 0;
                                                return (
                                                    <div key={rating} className="flex items-center gap-4">
                                                        <div className="flex items-center gap-1.5 w-8">
                                                            <span className="text-xs font-black text-gray-700">{rating}</span>
                                                            <Star className="h-3 w-3 fill-gray-400 text-gray-400" />
                                                        </div>
                                                        <div className="flex-1 h-2 bg-gray-50 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <div className="w-8 text-right">
                                                            <span className="text-xs font-bold text-gray-400">{count}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {!isOwner && (
                                            <Button
                                                onClick={() => setIsReviewModalOpen(true)}
                                                className="rounded-2xl bg-gray-900 hover:bg-black text-white px-8 py-6 font-bold h-auto shadow-xl shadow-gray-200"
                                            >
                                                Értékelés írása
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Review List */}
                                <div className="space-y-6">
                                    {salonReviews.length > 0 ? (
                                        salonReviews.map((review: any) => (
                                            <div key={review.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 flex gap-5 items-start group hover:border-primary/10 transition-colors">
                                                <div className="relative h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                                    <img
                                                        src={normalizeImageSrc(review.user?.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || "Guest")}&background=random`}
                                                        alt={review.user?.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{review.user?.name || "Vendég"}</h4>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <Star
                                                                        key={s}
                                                                        className={cn(
                                                                            "h-3 w-3",
                                                                            review.rating >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                                        )}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {new Date(review.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed italic">
                                                        "{review.comment}"
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                                            <div className="h-16 w-16 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4">
                                                <Star className="h-8 w-8 text-gray-200" />
                                            </div>
                                            <h3 className="font-bold text-gray-900">Még nincs értékelés</h3>
                                            <p className="text-gray-400 text-sm mt-1 mb-6">Légy te az első, aki véleményt mond!</p>
                                            {!isOwner && (
                                                <Button
                                                    onClick={() => setIsReviewModalOpen(true)}
                                                    variant="outline"
                                                    className="rounded-xl font-bold border-gray-200"
                                                >
                                                    Értékelés írása
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "about" && (
                            <div className="space-y-10">
                                {!salon.isTeam ? (
                                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start">
                                        <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-primary/5 flex-shrink-0 shadow-lg shadow-primary/10/50">
                                            <img
                                                src={normalizeImageSrc(salon.ownerImage) || avatar}
                                                alt={salon.ownerName || salon.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900">{salon.ownerName || salon.name}</h3>
                                                <p className="text-primary font-semibold">{salon.categories?.[0] || "Szolgáltató"}</p>
                                            </div>
                                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                {salon.aboutMe || "Még nincs bemutatkozás megadva."}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ismerd meg a csapatunkat</h3>
                                        <div className="grid sm:grid-cols-2 gap-6">
                                            {salonTeamMembers.map((member: any) => (
                                                <div key={member.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex gap-4 items-center group hover:shadow-md transition-shadow">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gray-50 group-hover:border-primary/20 transition-colors">
                                                        <img
                                                            src={normalizeImageSrc(member.image) || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"}
                                                            alt={member.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{member.name}</h4>
                                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{member.role}</p>
                                                        {member.description && (
                                                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{member.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {salonTeamMembers.length === 0 && (
                                            <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                A csapat tagjai még nincsenek feltöltve.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right info sidebar — contact, hours, map */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-24">
                            <ProfileSidebar salon={salon} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Zoomed"
                        className="max-h-[90vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <MessageModal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                receiverId={salon?.ownerId}
                receiverName={salon?.name}
                salonId={salon?.id}
            />

            {salon && (
                <AppointmentRequestModal
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    salonId={salon.id}
                    salonName={salon.name}
                    services={salon.services || []}
                />
            )}

            <PostModal
                isOpen={isPostModalOpen}
                onClose={() => {
                    setIsPostModalOpen(false)
                    setEditingPost(null)
                }}
                onSave={handleSavePost}
                initialContent={editingPost?.content}
                initialImages={editingPost?.images}
                initialLayout={editingPost?.layout}
                isEditing={!!editingPost}
            />

            {salon && userData && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    salonId={salon.id}
                    userId={userData.id}
                    onSuccess={loadSalonData}
                />
            )}
            </PageErrorBoundary>
        </MainLayout>
    )
}
