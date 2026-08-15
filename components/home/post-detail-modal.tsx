"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { Heart, MessageCircle, Share2, Star, X, ChevronLeft, ChevronRight, LayoutGrid, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { getPostComments, addComment } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { SafeImage } from "@/components/ui/safe-image"

function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
    const [index, setIndex] = useState(initialIndex)
    const containerRef = useCallback((node: HTMLDivElement | null) => { node?.focus() }, [])

    const prev = useCallback(() => setIndex(i => (i === 0 ? images.length - 1 : i - 1)), [images.length])
    const next = useCallback(() => setIndex(i => (i === images.length - 1 ? 0 : i + 1)), [images.length])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); onClose() }
            if (e.key === "ArrowLeft") { e.stopPropagation(); prev() }
            if (e.key === "ArrowRight") { e.stopPropagation(); next() }
        }
        // capture:true → ez fut le előbb, mint a Radix Dialog Escape-kezelője
        window.addEventListener("keydown", onKey, { capture: true })
        return () => window.removeEventListener("keydown", onKey, { capture: true })
    }, [onClose, prev, next])

    return createPortal(
        <div
            ref={containerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/92 outline-none pointer-events-auto"
            onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.target === e.currentTarget) onClose()
            }}
            onClick={(e) => {
                e.stopPropagation()
                if (e.target === e.currentTarget) onClose()
            }}
        >
            {/* Close button */}
            <button
                type="button"
                className="absolute right-4 top-4 z-[2147483647] rounded-full bg-white/12 p-3 text-white shadow-2xl transition-colors hover:bg-white/24 focus:outline-none focus:ring-2 focus:ring-white/70"
                onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClose()
                }}
                aria-label="Bezárás"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Image */}
            <div
                className="relative z-[2147483646] mx-4 h-full max-h-[90vh] w-full max-w-5xl cursor-default pointer-events-auto"
                onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
                onClick={e => e.stopPropagation()}
            >
                <SafeImage
                    src={images[index]}
                    alt={`Kép ${index + 1}`}
                    fill
                    className="object-contain pointer-events-auto"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    priority
                />
            </div>

            {/* Navigation */}
            {images.length > 1 && (
                <>
                    <button
                        className="absolute left-4 top-1/2 z-[2147483647] -translate-y-1/2 rounded-full bg-white/12 p-3 text-white transition-colors hover:bg-white/24"
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); prev() }}
                        aria-label="Előző kép"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        className="absolute right-4 top-1/2 z-[2147483647] -translate-y-1/2 rounded-full bg-white/12 p-3 text-white transition-colors hover:bg-white/24"
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); next() }}
                        aria-label="Következő kép"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                    <div className="absolute bottom-6 inset-x-0 z-[2147483647] flex justify-center gap-2">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onPointerDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setIndex(i) }}
                                className={cn(
                                    "h-2 rounded-full transition-all",
                                    i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                                )}
                                aria-label={`${i + 1}. kép`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>,
        document.body
    )
}

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

type PostComment = {
    id: string
    content: string
    createdAt: string | Date
    user: {
        id: string
        name?: string | null
        image?: string | null
    }
}

export function PostDetailModal({ isOpen, onClose, post, onLike }: PostDetailModalProps) {
    const { userData } = useAuth()
    const [isLiked, setIsLiked] = useState(post.isLiked || false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [comments, setComments] = useState<PostComment[]>([])
    const [commentLoading, setCommentLoading] = useState(false)
    const [newComment, setNewComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const loadComments = useCallback(async () => {
        setCommentLoading(true)
        try {
            const fetched = await getPostComments(post.id)
            setComments(fetched)
        } catch (error) {
            console.error("Error loading comments:", error)
        } finally {
            setCommentLoading(false)
        }
    }, [post.id])

    useEffect(() => {
        if (isOpen && post.id) {
            loadComments()
        }
    }, [isOpen, loadComments, post.id])

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userData) {
            toast.error("Be kell jelentkezned a hozzászóláshoz!")
            return
        }
        if (!newComment.trim()) return

        setIsSubmitting(true)
        try {
            const comment = await addComment(post.id, userData.id, newComment.trim())
            setComments([...comments, {
                ...comment,
                user: {
                    id: userData.id,
                    name: userData.name,
                    image: userData.image
                }
            }])
            setNewComment("")
            toast.success("Hozzászólás elküldve!")
        } catch (error) {
            console.error("Error adding comment:", error)
            toast.error("Hiba történt a hozzászólás során!")
        } finally {
            setIsSubmitting(false)
        }
    }

    const images = post.images || []

    return (
        <>
        {lightboxIndex !== null && (
            <ImageLightbox
                images={images}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
            />
        )}
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && lightboxIndex === null) onClose() }}>
            <DialogContent
                className={cn(
                    "max-w-5xl p-0 overflow-hidden border-none bg-surface rounded-3xl shadow-2xl",
                    lightboxIndex !== null && "pointer-events-none"
                )}
                onPointerDownOutside={lightboxIndex !== null ? e => e.preventDefault() : undefined}
                onInteractOutside={lightboxIndex !== null ? e => e.preventDefault() : undefined}
                onEscapeKeyDown={lightboxIndex !== null ? e => e.preventDefault() : undefined}
            >
                <DialogTitle className="sr-only">Bejegyzés: {post.author.name}</DialogTitle>
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-[80] flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-soft transition-colors hover:bg-white hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    aria-label="Bezárás"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="flex flex-col lg:flex-row h-[80vh]">
                    {/* Left side: Image */}
                    <div className="relative w-full lg:w-3/5 bg-muted min-h-[300px]">
                        {images.length > 0 ? (
                            <>
                                <button
                                    className="absolute inset-0 w-full h-full group cursor-zoom-in"
                                    onClick={() => setLightboxIndex(currentImageIndex)}
                                    aria-label="Kép nagyítása"
                                >
                                    <SafeImage
                                        src={images[currentImageIndex]}
                                        alt={post.content}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 60vw"
                                        priority
                                    />
                                    <span className="absolute top-3 right-3 rounded-full bg-black/30 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <ZoomIn className="h-4 w-4" />
                                    </span>
                                </button>
                                {images.length > 1 && (
                                    <>
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-10">
                                            <button
                                                onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)) }}
                                                className="bg-white/80 hover:bg-white text-foreground rounded-full p-2 shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </button>
                                        </div>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 z-10">
                                            <button
                                                onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)) }}
                                                className="bg-white/80 hover:bg-white text-foreground rounded-full p-2 shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 z-10">
                                            {images.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={e => { e.stopPropagation(); setCurrentImageIndex(i) }}
                                                    className={cn(
                                                        "h-2 rounded-full transition-all shadow-md",
                                                        i === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                <LayoutGrid className="h-12 w-12" />
                                <span className="text-sm font-bold uppercase tracking-widest">Nincs kép</span>
                            </div>
                        )}

                    </div>

                    {/* Right side: Info */}
                    <div className="flex flex-col w-full lg:w-2/5 border-l border-border bg-surface">
                        {/* Header */}
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between mb-4">
                                <Link href={`/profile/${post.author.slug}`} className="flex items-center gap-3">
                                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-primary/10 p-0.5">
                                        <div className="relative h-full w-full rounded-full overflow-hidden">
                                            <SafeImage
                                                src={post.author.avatar}
                                                alt={post.author.name}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                                fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=random`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground leading-tight">{post.author.name}</span>
                                        <span className="text-xs text-primary font-medium">{post.author.role}</span>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                                    <Star className="h-3 w-3 fill-yellow-600" />
                                    <span className="text-xs font-bold font-serif">{post.author.rating?.toFixed(1) || "0.0"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content area: scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border">
                            <div className="space-y-4">
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                    {post.content}
                                </p>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    {new Date(post.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            {/* Section for comments */}
                            <div className="pt-4 border-t border-border">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                                    Hozzászólások ({comments.length})
                                </h4>

                                {commentLoading && comments.length === 0 ? (
                                    <div className="space-y-4 animate-pulse">
                                        {[1, 2].map(i => (
                                            <div key={i} className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                                                <div className="space-y-1 flex-1">
                                                    <div className="h-3 w-24 bg-muted rounded" />
                                                    <div className="h-3 w-full bg-muted rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : comments.length > 0 ? (
                                    <div className="space-y-4">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 group/comment">
                                                <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-border">
                                                    <SafeImage
                                                        src={comment.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || "User")}&background=random`}
                                                        alt={comment.user.name || "User"}
                                                        fill
                                                        className="object-cover"
                                                        sizes="32px"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-bold text-foreground">{comment.user.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(comment.createdAt).toLocaleDateString('hu-HU')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                                        {comment.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground italic">Még nincsenek hozzászólások. Legyél te az első!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer interactions / Comment input */}
                        <div className="p-4 border-t border-border bg-surface">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => {
                                            setIsLiked(!isLiked);
                                            if (onLike) onLike(post.id);
                                        }}
                                        className="group flex items-center gap-1.5 transition-colors"
                                    >
                                        <Heart className={cn("h-5 w-5 transition-transform group-hover:scale-110", isLiked ? "fill-primary text-primary" : "text-muted-foreground")} />
                                        <span className="text-xs font-bold text-muted-foreground">{post.likes + (isLiked && !post.isLiked ? 1 : (!isLiked && post.isLiked ? -1 : 0))}</span>
                                    </button>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <MessageCircle className="h-5 w-5" />
                                        <span className="text-xs font-bold">{comments.length}</span>
                                    </div>
                                </div>
                                <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-muted-foreground transition-colors" />
                            </div>

                            <form onSubmit={handleAddComment} className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Írj egy hozzászólást..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-muted border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || isSubmitting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary disabled:text-muted-foreground font-bold text-sm transition-colors"
                                    >
                                        Küldés
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}
