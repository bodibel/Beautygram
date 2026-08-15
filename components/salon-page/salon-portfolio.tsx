"use client"

import { useMemo, useState } from "react"
import { Heart, MessageCircle, Share2, Star } from "lucide-react"
import { toast } from "sonner"

import { PostDetailModal } from "@/components/home/post-detail-modal"
import { SafeImage } from "@/components/ui/safe-image"
import type { SalonPageData, SalonPagePost } from "@/components/salon-page/types"
import { toggleLike } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface SalonPortfolioProps {
  salon: SalonPageData
  onOpenImage: (image: string) => void
}

function WorkImageMosaic({ images, alt }: { images: string[]; alt: string }) {
  const visibleImages = images.slice(0, 4)

  if (visibleImages.length === 0) return null

  if (visibleImages.length === 1) {
    return (
      <SafeImage
        src={visibleImages[0]}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 760px"
        className="salon-work-card-image object-cover"
      />
    )
  }

  if (visibleImages.length === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-px bg-white/20">
        {visibleImages.map((image, index) => (
          <div key={`${image}-${index}`} className="relative overflow-hidden">
            <SafeImage
              src={image}
              alt={`${alt} ${index + 1}. kép`}
              fill
              sizes="(max-width: 1024px) 50vw, 380px"
              className="salon-work-card-image object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  if (visibleImages.length === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-[1.1fr_0.9fr] gap-px bg-white/20">
        <div className="relative overflow-hidden">
          <SafeImage
            src={visibleImages[0]}
            alt={`${alt} 1. kép`}
            fill
            sizes="(max-width: 1024px) 55vw, 420px"
            className="salon-work-card-image object-cover"
          />
        </div>
        <div className="grid gap-px">
          {visibleImages.slice(1).map((image, index) => (
            <div key={`${image}-${index}`} className="relative overflow-hidden">
              <SafeImage
                src={image}
                alt={`${alt} ${index + 2}. kép`}
                fill
                sizes="(max-width: 1024px) 45vw, 340px"
                className="salon-work-card-image object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-px bg-white/20">
      {visibleImages.map((image, index) => (
        <div key={`${image}-${index}`} className="relative overflow-hidden">
          <SafeImage
            src={image}
            alt={`${alt} ${index + 1}. kép`}
            fill
            sizes="(max-width: 1024px) 50vw, 380px"
            className="salon-work-card-image object-cover"
          />
        </div>
      ))}
    </div>
  )
}

export function SalonPortfolio({ salon }: SalonPortfolioProps) {
  const { userData } = useAuth()
  const [selectedPost, setSelectedPost] = useState<SalonPagePost | null>(null)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set())
  const [likeDeltaByPostId, setLikeDeltaByPostId] = useState<Record<string, number>>({})
  const posts = (salon.posts || []).filter((post) => post.content?.trim() || post.images?.length)

  const postForModal = useMemo(() => {
    if (!selectedPost) return null

    const likes = selectedPost._count?.likes || 0
    const comments = selectedPost._count?.comments || 0
    const isLiked = Boolean(selectedPost.isLiked || likedPostIds.has(selectedPost.id))

    return {
      id: selectedPost.id,
      author: {
        id: salon.ownerId,
        name: salon.name,
        avatar: salon.profileImage || salon.ownerImage || salon.images?.[0] || "",
        role: "Szalon",
        slug: salon.slug,
        rating: salon.rating || undefined,
        reviewCount: salon.reviewCount || undefined,
      },
      images: selectedPost.images || [],
      content: selectedPost.content,
      likes: likes + (likeDeltaByPostId[selectedPost.id] || 0),
      comments,
      isLiked,
      createdAt: new Date(selectedPost.createdAt),
    }
  }, [likeDeltaByPostId, likedPostIds, salon, selectedPost])

  if (posts.length === 0) return null

  const handleLike = async (postId: string) => {
    if (!userData?.id) {
      toast.error("Lájkoláshoz jelentkezz be.")
      return
    }

    const wasLiked = likedPostIds.has(postId)
    setLikedPostIds((current) => {
      const next = new Set(current)
      if (wasLiked) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
    setLikeDeltaByPostId((current) => ({
      ...current,
      [postId]: (current[postId] || 0) + (wasLiked ? -1 : 1),
    }))

    try {
      await toggleLike(postId, userData.id)
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Nem sikerült menteni a lájkot.")
      setLikedPostIds((current) => {
        const next = new Set(current)
        if (wasLiked) {
          next.add(postId)
        } else {
          next.delete(postId)
        }
        return next
      })
      setLikeDeltaByPostId((current) => ({
        ...current,
        [postId]: (current[postId] || 0) + (wasLiked ? 1 : -1),
      }))
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-text-primary">Munkák</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Friss munkák és bejegyzések a szalontól.</p>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => {
          const likes = (post._count?.likes || 0) + (likeDeltaByPostId[post.id] || 0)
          const comments = post._count?.comments || 0
          const isLiked = Boolean(post.isLiked || likedPostIds.has(post.id))
          const hasRating = Boolean(salon.rating && salon.rating > 0)
          const cardImages = post.images?.length
            ? post.images
            : [salon.images?.[0] || salon.profileImage || ""].filter(Boolean)
          const imageAlt = post.content || `${salon.name} munka`

          return (
            <article
              key={post.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPost(post)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setSelectedPost(post)
                }
              }}
              className="salon-work-card group relative min-h-[420px] cursor-pointer overflow-hidden rounded-[28px] bg-surface-muted text-white shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <WorkImageMosaic images={cardImages} alt={imageAlt} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/28 to-black/5" />

              {hasRating && (
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-text-primary shadow-soft">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  {salon.rating?.toFixed(1)}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
                {post.content?.trim() && <p className="line-clamp-2 text-sm font-semibold leading-6 text-white">{post.content.trim()}</p>}
                <span className="inline-flex text-xs font-bold uppercase tracking-wide text-white/62">Több...</span>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleLike(post.id)
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-accent-soft"
                    >
                      <Heart className={cn("h-5 w-5", isLiked && "fill-current text-accent-soft")} />
                      {likes}
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                      <MessageCircle className="h-5 w-5" />
                      {comments}
                    </span>
                  </div>
                  <Share2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {postForModal && (
        <PostDetailModal
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          post={postForModal}
          onLike={handleLike}
        />
      )}
    </section>
  )
}
