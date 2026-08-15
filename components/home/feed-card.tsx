"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, MessageCircle, Share2, Star, Pencil, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { hu } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { PostDetailModal } from "./post-detail-modal"
import { SafeImage } from "@/components/ui/safe-image"

type FeedCardPost = {
    id: string
    author: {
        id: string
        name: string
        ownerId?: string
        avatar: string
        role: string
        slug: string
        currency?: string
        minPrice?: number
        rating?: number
        reviewCount?: number
    }
    images: string[]
    layout?: string
    content: string
    likes: number
    comments: number
    isLiked?: boolean
    createdAt: Date
}

interface FeedCardProps {
    post: FeedCardPost
    isOwner?: boolean
    onEdit?: (post: FeedCardPost) => void
    onLike?: (postId: string) => void
}

export function FeedCard({ post, isOwner, onEdit, onLike }: FeedCardProps) {
    const [isLiked, setIsLiked] = useState(post.isLiked || false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isExpanded, setIsExpanded] = useState(false)

    const images = post.images || []
    const layout = post.layout || "grid"

    const renderImages = () => {
        if (images.length === 0) {
            return (
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <LayoutGrid className="h-10 w-10 text-muted-foreground/30" />
                </div>
            )
        }

        if (layout === "carousel") {
            return (
                <div className="relative aspect-[4/3] w-full group/carousel">
                    <SafeImage
                        src={images[currentImageIndex]}
                        alt={post.content}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 600px"
                    />
                    {images.length > 1 && (
                        <>
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
                                    }}
                                    className="bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
                                    }}
                                    className="bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="absolute bottom-20 inset-x-0 flex justify-center gap-1.5 z-10">
                                {images.map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all shadow-sm",
                                            i === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                        )}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )
        }

        if (layout === "collage" && images.length >= 3) {
            return (
                <div className="grid grid-cols-2 gap-0.5 aspect-[4/3] overflow-hidden">
                    <div className="relative h-full">
                        <SafeImage src={images[0]} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                    </div>
                    <div className="grid grid-rows-2 gap-0.5">
                        <div className="relative h-full">
                            <SafeImage src={images[1]} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                        </div>
                        <div className="relative h-full">
                            <SafeImage src={images[2]} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                            {images.length > 3 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="text-white font-black text-xl">+{images.length - 3}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        if (layout === "columns") {
            return (
                <div className="flex flex-col gap-0.5">
                    {images.slice(0, 3).map((img, i) => (
                        <div key={i} className="relative aspect-[16/9] w-full">
                            <SafeImage src={img} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 600px" />
                        </div>
                    ))}
                </div>
            )
        }

        // Default: Grid
        return (
            <div className={cn(
                "grid gap-0.5 aspect-[4/3] w-full overflow-hidden",
                images.length === 1 ? "grid-cols-1" :
                    images.length === 2 ? "grid-cols-2" :
                        "grid-cols-2 grid-rows-2"
            )}>
                {images.slice(0, 4).map((img, i) => (
                    <div key={i} className={cn("relative h-full", i === 0 && images.length === 3 && "row-span-2")}>
                        <SafeImage src={img} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                        {i === 3 && images.length > 4 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="text-white font-black text-xl">+{images.length - 4}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    const likeCount = post.likes + (isLiked && !post.isLiked ? 1 : (!isLiked && post.isLiked ? -1 : 0))

    return (
        <>
            <div className="group relative w-full overflow-hidden rounded-3xl bg-surface border border-border shadow-sm hover:shadow-md transition-shadow">

                {/* ── Image block with overlays ── */}
                <div
                    className="relative overflow-hidden cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                >
                    {renderImages()}

                    {/* Gradient overlay — fades image to dark at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                    {/* Rating badge — top right */}
                    {post.author.rating !== undefined && post.author.rating > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm z-10">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-gray-900">{post.author.rating.toFixed(1)}</span>
                        </div>
                    )}

                    {/* Edit button — top left (owner only) */}
                    {isOwner && onEdit && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(post) }}
                            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black/60 transition-colors z-10"
                        >
                            <Pencil className="h-3 w-3" />
                            Szerkesztés
                        </button>
                    )}

                    {/* Bottom overlay — author + text + actions */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pt-10 pb-4 flex flex-col gap-2">

                        {/* Author info */}
                        <Link
                            href={`/profile/${post.author.slug}`}
                            className="flex items-center gap-3"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/60 shadow-md">
                                <SafeImage
                                    src={post.author.avatar}
                                    alt={post.author.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                    fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=random`}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white leading-tight truncate">{post.author.name}</p>
                                <p className="text-[11px] text-white/70 leading-tight">
                                    {post.author.role} · {formatDistanceToNow(post.createdAt, { locale: hu, addSuffix: true })}
                                </p>
                            </div>
                        </Link>

                        {/* Post text */}
                        {post.content && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <p className="text-sm text-white/90 leading-relaxed">
                                    <span className={cn(!isExpanded && "line-clamp-2")}>
                                        {post.content}
                                    </span>
                                </p>
                                {!isExpanded && post.content.length > 100 && (
                                    <button
                                        type="button"
                                        className="text-white/50 text-xs font-bold hover:text-white/80 mt-0.5 uppercase tracking-wide"
                                        onClick={() => setIsExpanded(true)}
                                    >
                                        Több...
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => { setIsLiked(!isLiked); if (onLike) onLike(post.id) }}
                                className={cn(
                                    "flex items-center gap-1.5 text-sm transition-colors",
                                    isLiked ? "text-red-400" : "text-white/80 hover:text-white"
                                )}
                            >
                                <Heart className={cn("h-5 w-5", isLiked && "fill-red-400 stroke-red-400")} />
                                <span className="font-medium">{likeCount}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
                            >
                                <MessageCircle className="h-5 w-5" />
                                <span className="font-medium">{post.comments}</span>
                            </button>

                            <div className="flex-1" />

                            <button
                                type="button"
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <Share2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <PostDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                post={post}
                onLike={onLike}
            />
        </>
    )
}
