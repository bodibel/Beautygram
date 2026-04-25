"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import Link from "next/link"
import { Heart, MessageCircle, Share2, Star, X, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getPostComments, addComment } from "@/lib/actions/salon"
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
    const [comments, setComments] = useState<any[]>([])
    const [commentLoading, setCommentLoading] = useState(false)
    const [newComment, setNewComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen && post.id) {
            loadComments()
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

    const images = normalizeImageList(post.images)
    const authorAvatar = normalizeImageSrc(post.author.avatar) || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl overflow-hidden rounded-3xl border-none bg-surface p-0 shadow-2xl [&>button:last-child]:hidden">
                <DialogTitle className="sr-only">Bejegyzés: {post.author.name}</DialogTitle>
                <div className="flex flex-col lg:flex-row h-[80vh]">
                    {/* Left side: Image */}
                    <div className="relative w-full lg:w-3/5 bg-muted min-h-[300px]">
                        {images.length > 0 ? (
                            <>
                                <Image
                                    src={images[currentImageIndex]}
                                    alt={post.content}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                {images.length > 1 && (
                                    <>
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                            <button
                                                onClick={() => setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                                                className="bg-white/80 hover:bg-white text-foreground rounded-full p-2 shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </button>
                                        </div>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                            <button
                                                onClick={() => setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                                                className="bg-white/80 hover:bg-white text-foreground rounded-full p-2 shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2">
                                            {images.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentImageIndex(i)}
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

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute right-4 top-4 z-50 rounded-full bg-black/20 text-white hover:bg-black/40"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Right side: Info */}
                    <div className="flex flex-col w-full lg:w-2/5 border-l border-border bg-surface">
                        {/* Header */}
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between mb-4">
                                <Link href={`/profile/${post.author.slug}`} className="flex items-center gap-3">
                                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-primary/10 p-0.5">
                                        <div className="relative h-full w-full rounded-full overflow-hidden">
                                            <Image src={authorAvatar} alt={post.author.name} fill className="object-cover" />
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
                                                    <Image
                                                        src={normalizeImageSrc(comment.user.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || "User")}&background=random`}
                                                        alt={comment.user.name || "User"}
                                                        fill
                                                        className="object-cover"
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
    )
}
