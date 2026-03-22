"use client"

import { useState, use, useEffect } from "react"
import Image from "next/image"
import { MainLayout } from "@/components/layout/main-layout"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { FeedCard } from "@/components/home/feed-card"
import { Card, CardContent } from "@/components/ui/card"
import { getPublicSalonData } from "@/lib/actions/salon"
import { Star, X, Maximize2, Plus, ImagePlus } from "lucide-react"
import { MessageModal } from "@/components/salon/message-modal"
import { useAuth } from "@/lib/auth-context"
import { PostModal } from "@/components/salon/modals/PostModal"
import { createPost, updatePost, deletePost, toggleLike, createReview } from "@/lib/actions/salon"
import { ReviewModal } from "@/components/profile/ReviewModal"
import { useSalonProfile } from "@/lib/salon-profile-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { userData } = useAuth()
    const { slug } = use(params)
    const [activeTab, setActiveTab] = useState("posts")
    const [salon, setSalon] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
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
                    posts: salon.posts.map((p: any) => p.id === editingPost.id ? { ...p, content, images: imageUrls, layout } : p)
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
                    posts: [newPost, ...salon.posts]
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
            const data = await getPublicSalonData(slug)
            setSalon(data)
        } catch (error) {
            console.error("Error loading salon data:", error)
        } finally {
            setLoading(false)
        }
    }

    // Sync salon data into the global SalonProfileContext (powers the left sidebar)
    useEffect(() => {
        if (salon && salonProfileCtx) {
            salonProfileCtx.setSalonProfile({
                id: salon.id,
                name: salon.name,
                avatar: salon.profileImage || salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
                categories: salon.categories || [],
                rating: salon.rating || 0,
                reviewCount: salon.reviewCount || 0,
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

    if (loading || (!salon && slug !== "me")) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <p className="text-gray-400 font-medium">Profil betöltése...</p>
                </div>
            </MainLayout>
        )
    }

    const coverImage = salon.coverImage || salon.images?.[0] || "https://images.unsplash.com/photo-1521590832896-7bbc16635175?w=1200&q=80"
    const avatar = salon.profileImage || salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"
    const isOwner = userData?.id === salon?.ownerId

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="pb-20 pr-6">
                {/* ── Cover Image ── */}
                <div className="relative h-56 md:h-72 w-full overflow-hidden rounded-2xl shadow-sm mt-2">
                    <Image
                        src={coverImage}
                        alt={`${salon.name} cover`}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* ── Tabs ── */}
                <div className="mt-4">
                    <ProfileTabs activeTab={activeTab} onChange={setActiveTab} isTeam={salon.isTeam} />
                </div>

                {/* ── Content grid: main content + info sidebar ── */}
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

                                {salon.posts?.length > 0 ? (
                                    salon.posts.map((post: any) => (
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
                                                    role: salon.categories?.[0] || "Beauty Salon"
                                                },
                                                images: post.images,
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
                                {salon.services?.map((service: any, index: number) => (
                                    <div key={index} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{service.duration}</p>
                                        </div>
                                        <div className="font-bold text-primary bg-accent px-3 py-1 rounded-full">
                                            {service.price} {salon.currency}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "gallery" && (
                            <div>
                                {salon.images?.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {salon.images.map((img: string, index: number) => (
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
                                                {salon.rating?.toFixed(1) || "0.0"}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={cn(
                                                            "h-5 w-5",
                                                            (salon.rating || 0) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
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
                                                const count = salon.reviews?.filter((r: any) => r.rating === rating).length || 0;
                                                const percentage = salon.reviewCount > 0 ? (count / salon.reviewCount) * 100 : 0;
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
                                    {salon.reviews?.length > 0 ? (
                                        salon.reviews.map((review: any) => (
                                            <div key={review.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 flex gap-5 items-start group hover:border-primary/10 transition-colors">
                                                <div className="relative h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                                    <img
                                                        src={review.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || "Guest")}&background=random`}
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
                                                src={salon.ownerImage || avatar}
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
                                            {salon.teamMembers?.map((member: any) => (
                                                <div key={member.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex gap-4 items-center group hover:shadow-md transition-shadow">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gray-50 group-hover:border-primary/20 transition-colors">
                                                        <img
                                                            src={member.image || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"}
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
                                        {(!salon.teamMembers || salon.teamMembers.length === 0) && (
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
        </MainLayout>
    )
}
