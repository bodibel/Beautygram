"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import Link from "next/link"
import { Heart, MessageCircle, Share2, Star, X, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { getPostComments, addComment, toggleCommentLike } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { normalizeImageList, normalizeImageSrc } from "@/lib/image-utils"

interface PostDetailModalProps {
    isOpen: boolean
    onClose: () => void
    post: {
        id: string
        author: {
            id: string
            name: string
            avatar: string
            role: string
            slug: string
            currency?: string
            minPrice?: number
            rating?: number
            reviewCount?: number
        }
        images: string[]
        content: string
        likes: number
        comments: number
        isLiked?: boolean
        createdAt: Date
    }
    onLike?: (postId: string) => void
}

export function PostDetailModal({ isOpen, onClose, post, onLike }: PostDetailModalProps) {
    const { userData } = useAuth()
    const [isLiked, setIsLiked] = useState(post.isLiked || false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false)
    const [comments, setComments] = useState<any[]>([])
    const [commentLoading, setCommentLoading] = useState(false)
    const [newComment, setNewComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const touchStartXRef = useRef<number | null>(null)
    const touchEndXRef = useRef<number | null>(null)
    const suppressImageClickRef = useRef(false)
    const suppressNextLightboxOpenRef = useRef(false)

    useEffect(() => {
        if (isOpen && post.id) {
            void loadComments()
        }
    }, [isOpen, post.id])

    const loadComments = async () => {
        setCommentLoading(true)
        try {
            const fetched = await getPostComments(post.id)
            setComments(fetched)
        } catch (error) {
            console.error("Error loading comments:", error)
        } finally {
            setCommentLoading(false)
        }
    }

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userData) {
            toast.error("Be kell jelentkezned a hozzaszolashoz!")
            return
        }
        if (!newComment.trim()) return

        setIsSubmitting(true)
        try {
            const comment = await addComment(post.id, userData.id, newComment.trim())
            setComments([
                ...comments,
                {
                    ...comment,
                    user: {
                        id: userData.id,
                        name: userData.name,
                        image: userData.image,
                    },
                    likeCount: 0,
                    isLiked: false,
                },
            ])
            setNewComment("")
            toast.success("Hozzaszolas elkuldve!")
        } catch (error) {
            console.error("Error adding comment:", error)
            toast.error("Hiba tortent a hozzaszolas soran!")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleCommentLike = async (commentId: string) => {
        if (!userData) {
            toast.error("Be kell jelentkezned a komment lajkolasahoz!")
            return
        }

        try {
            const result = await toggleCommentLike(commentId, userData.id)
            setComments((current) =>
                current.map((comment) =>
                    comment.id === commentId
                        ? {
                            ...comment,
                            isLiked: result.isLiked,
                            likeCount: result.likeCount,
                        }
                        : comment
                )
            )
        } catch (error) {
            console.error("Error toggling comment like:", error)
            toast.error("Hiba tortent a komment lajkolasa soran!")
        }
    }

    const images = normalizeImageList(post.images)
    const authorAvatar =
        normalizeImageSrc(post.author.avatar) ||
        "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"

    const showPreviousImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }

    const showNextImage = () => {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }

    const handleTouchStart = (clientX: number) => {
        touchStartXRef.current = clientX
        touchEndXRef.current = clientX
        suppressImageClickRef.current = false
    }

    const handleTouchMove = (clientX: number) => {
        touchEndXRef.current = clientX
    }

    const handleTouchEnd = () => {
        if (touchStartXRef.current === null || touchEndXRef.current === null || images.length <= 1) {
            touchStartXRef.current = null
            touchEndXRef.current = null
            return
        }

        const deltaX = touchStartXRef.current - touchEndXRef.current
        const swipeThreshold = 40

        if (Math.abs(deltaX) > swipeThreshold) {
            suppressImageClickRef.current = true
            if (deltaX > 0) {
                showNextImage()
            } else {
                showPreviousImage()
            }
        }

        touchStartXRef.current = null
        touchEndXRef.current = null
    }

    const handleImageClick = () => {
        if (suppressNextLightboxOpenRef.current) {
            suppressNextLightboxOpenRef.current = false
            return
        }

        if (suppressImageClickRef.current) {
            suppressImageClickRef.current = false
            return
        }
        setIsFullscreenImageOpen(true)
    }

    const closeFullscreenLightbox = () => {
        suppressNextLightboxOpenRef.current = true
        setIsFullscreenImageOpen(false)
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (!open && isFullscreenImageOpen) {
            setIsFullscreenImageOpen(false)
            return
        }

        if (!open) {
            onClose()
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent
                    className={cn(
                        "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden rounded-3xl border-none bg-surface p-0 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full [&>button:last-child]:hidden"
                    )}
                    onPointerDownOutside={(event) => {
                        if (isFullscreenImageOpen) {
                            event.preventDefault()
                        }
                    }}
                    onInteractOutside={(event) => {
                        if (isFullscreenImageOpen) {
                            event.preventDefault()
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (isFullscreenImageOpen) {
                            event.preventDefault()
                            closeFullscreenLightbox()
                        }
                    }}
                >
                    <DialogTitle className="sr-only">Bejegyzes: {post.author.name}</DialogTitle>

                <div className="flex h-full min-h-0 flex-col lg:h-[80vh] lg:flex-row">
                    <div
                        className="relative h-64 w-full shrink-0 bg-muted sm:h-72 lg:h-auto lg:min-h-[300px] lg:w-3/5"
                        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
                        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                        onTouchEnd={handleTouchEnd}
                    >
                        {images.length > 0 ? (
                            <>
                                <Image
                                    src={images[currentImageIndex]}
                                    alt={post.content}
                                    fill
                                    className="cursor-zoom-in object-cover"
                                    priority
                                    onClick={handleImageClick}
                                />

                                {images.length > 1 && (
                                    <>
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                            <button
                                                type="button"
                                                onClick={showPreviousImage}
                                                className="rounded-full bg-white/80 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </button>
                                        </div>

                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                            <button
                                                type="button"
                                                onClick={showNextImage}
                                                className="rounded-full bg-white/80 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </button>
                                        </div>

                                        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
                                            {images.map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setCurrentImageIndex(i)}
                                                    className={cn(
                                                        "h-2 rounded-full shadow-md transition-all",
                                                        i === currentImageIndex
                                                            ? "w-6 bg-white"
                                                            : "w-2 bg-white/50 hover:bg-white/80"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                <LayoutGrid className="h-12 w-12" />
                                <span className="text-sm font-bold uppercase tracking-widest">Nincs kep</span>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute right-4 top-4 z-50 rounded-full bg-black/20 text-white hover:bg-black/40"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex min-h-0 w-full flex-1 flex-col border-t border-border bg-surface lg:w-2/5 lg:border-l lg:border-t-0">
                        <div className="shrink-0 border-b border-border p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <Link href={`/profile/${post.author.slug}`} className="flex min-w-0 items-center gap-3">
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-primary/10 p-0.5">
                                        <div className="relative h-full w-full overflow-hidden rounded-full">
                                            <Image src={authorAvatar} alt={post.author.name} fill className="object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate font-bold leading-tight text-foreground">
                                            {post.author.name}
                                        </span>
                                        <span className="text-xs font-medium text-primary">{post.author.role}</span>
                                    </div>
                                </Link>

                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-yellow-700">
                                    <Star className="h-3 w-3 fill-yellow-600" />
                                    <span className="font-serif text-xs font-bold">
                                        {post.author.rating?.toFixed(1) || "0.0"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {post.content}
                                    </p>
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        {new Date(post.createdAt).toLocaleDateString("hu-HU", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        Hozzaszolasok ({comments.length})
                                    </h4>

                                    {commentLoading && comments.length === 0 ? (
                                        <div className="animate-pulse space-y-4">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="flex gap-3">
                                                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-3 w-24 rounded bg-muted" />
                                                        <div className="h-3 w-full rounded bg-muted" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {comments.map((comment) => (
                                                <div key={comment.id} className="group/comment flex gap-3">
                                                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border">
                                                        <Image
                                                            src={
                                                                normalizeImageSrc(comment.user.image) ||
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                                    comment.user.name || "User"
                                                                )}&background=random`
                                                            }
                                                            alt={comment.user.name || "User"}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-0.5 flex items-center gap-2">
                                                            <span className="text-xs font-bold text-foreground">
                                                                {comment.user.name}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(comment.createdAt).toLocaleDateString("hu-HU")}
                                                            </span>
                                                        </div>
                                                        <p className="break-words text-xs leading-relaxed text-muted-foreground">
                                                            {comment.content}
                                                        </p>
                                                        <div className="mt-2 flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleCommentLike(comment.id)}
                                                                className="group/comment-like flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Heart
                                                                    className={cn(
                                                                        "h-3.5 w-3.5 transition-transform group-hover/comment-like:scale-110",
                                                                        comment.isLiked ? "fill-primary text-primary" : "text-muted-foreground"
                                                                    )}
                                                                />
                                                                <span>{comment.likeCount || 0}</span>
                                                                <span className="sr-only">Komment lajkolasa</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center">
                                            <p className="text-xs italic text-muted-foreground">
                                                Meg nincsenek hozzaszolasok. Legyel te az elso!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <div className="mb-4 flex items-center justify-between px-2">
                                <div className="flex items-center gap-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLiked(!isLiked)
                                            if (onLike) onLike(post.id)
                                        }}
                                        className="group flex items-center gap-1.5 transition-colors"
                                    >
                                        <Heart
                                            className={cn(
                                                "h-5 w-5 transition-transform group-hover:scale-110",
                                                isLiked ? "fill-primary text-primary" : "text-muted-foreground"
                                            )}
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {post.likes +
                                                (isLiked && !post.isLiked ? 1 : !isLiked && post.isLiked ? -1 : 0)}
                                        </span>
                                    </button>

                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <MessageCircle className="h-5 w-5" />
                                        <span className="text-xs font-bold">{comments.length}</span>
                                    </div>
                                </div>

                                <Share2 className="h-5 w-5 cursor-pointer text-muted-foreground transition-colors hover:text-foreground" />
                            </div>

                            <form onSubmit={handleAddComment} className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Irj egy hozzaszolast..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full rounded-2xl border-none bg-muted py-3 pl-4 pr-16 text-sm transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/10"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || isSubmitting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-sm font-bold text-primary transition-colors disabled:text-muted-foreground"
                                    >
                                        Kuldes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                </DialogContent>
            </Dialog>

            <Dialog open={isFullscreenImageOpen} onOpenChange={setIsFullscreenImageOpen}>
                <DialogContent
                    hideCloseButton
                    className="h-screen max-h-screen w-screen max-w-none rounded-none border-none bg-transparent p-0 shadow-none sm:h-screen sm:max-h-screen sm:w-screen"
                >
                    <DialogTitle className="sr-only">Teljes meretu kepnezet</DialogTitle>

                    <div
                        className="relative flex h-full w-full items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
                        onClick={closeFullscreenLightbox}
                        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
                        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                        onTouchEnd={handleTouchEnd}
                    >
                        <button
                            type="button"
                            onClick={closeFullscreenLightbox}
                            className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        showPreviousImage()
                                    }}
                                    className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        showNextImage()
                                    }}
                                    className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </>
                        )}

                        <div
                            className="relative z-10 h-full max-h-[94vh] w-full max-w-[96vw]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={images[currentImageIndex]}
                                alt={post.content}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
