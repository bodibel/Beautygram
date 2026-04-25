"use client"

import { useState, useEffect, useRef } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { FeedCard } from "@/components/home/feed-card"
import { StoryBar } from "@/components/home/story-bar"
import { getRecentPosts, updatePost, toggleLike } from "@/lib/actions/salon"
import { useFilter } from "@/lib/filter-context"
import { useAuth } from "@/lib/auth-context"
import { PostModal } from "@/components/salon/modals/PostModal"
import { toast } from "sonner"
import { PageErrorBoundary } from "@/components/ui/page-error-boundary"

export default function Home() {
  const { userData } = useAuth()
  const { location, filters } = useFilter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)

  const handleEditPost = (post: any) => {
    setEditingPost(post)
    setIsPostModalOpen(true)
  }

  const handleSavePost = async (content: string, imageUrls: string[], layout: string) => {
    try {
      if (editingPost) {
        await updatePost(editingPost.id, { content, images: imageUrls, layout })
        setPosts((current) => current.map((p) => p.id === editingPost.id ? { ...p, content, images: imageUrls, layout } : p))
        toast.success("BejegyzÃ©s frissÃ­tve!")
      }
      setIsPostModalOpen(false)
      setEditingPost(null)
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("Hiba tÃ¶rtÃ©nt a mentÃ©s sorÃ¡n!")
    }
  }

  const handleToggleLike = async (postId: string) => {
    if (!userData) {
      toast.error("Be kell jelentkezned a kedvelÃ©shez!")
      return
    }
    try {
      await toggleLike(postId, userData.id)
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Hiba tÃ¶rtÃ©nt!")
    }
  }

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setPage(1)
    loadInitialData()
  }, [location.lat, location.lng, location.radius, filters.services, filters.rating, filters.searchQuery])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hasAuthNoise = params.has("callbackUrl") || params.has("error")
    if (!hasAuthNoise) return

    const cleaned = new URLSearchParams(params.toString())
    cleaned.delete("callbackUrl")
    cleaned.delete("error")

    const nextUrl = cleaned.toString() ? `${window.location.pathname}?${cleaned.toString()}` : window.location.pathname
    window.history.replaceState({}, "", nextUrl)
  }, [])

  useEffect(() => {
    if (!hasMore || isFetchingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePosts()
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    )

    if (sentinelRef.current instanceof Element) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isFetchingMore, posts])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const recentPosts = await getRecentPosts(1, {
        lat: location.lat,
        lng: location.lng,
        radius: location.radius,
        categories: filters.services,
        minRating: filters.rating,
        searchQuery: filters.searchQuery
      }, userData?.id)

      setPosts(formatPosts(recentPosts))
      setHasMore(Array.isArray(recentPosts) && recentPosts.length === 20)
    } catch (error) {
      console.error("Error loading data:", error)
      setPosts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = async () => {
    setIsFetchingMore(true)
    const nextPage = page + 1
    try {
      const newPosts = await getRecentPosts(nextPage, {
        lat: location.lat,
        lng: location.lng,
        radius: location.radius,
        categories: filters.services,
        minRating: filters.rating,
        searchQuery: filters.searchQuery
      }, userData?.id)

      if (!Array.isArray(newPosts) || newPosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => [...prev, ...formatPosts(newPosts)])
        setPage(nextPage)
        setHasMore(newPosts.length === 20)
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
    } finally {
      setIsFetchingMore(false)
    }
  }

  const formatPosts = (rawPosts: any[]) => {
    if (!Array.isArray(rawPosts)) return []

    return rawPosts
      .filter((post) => post?.id && post?.salon?.id)
      .map((post) => {
        const prices = Array.isArray(post.salon?.services)
          ? post.salon.services.map((service: any) => service?.price).filter((price: any) => typeof price === "number")
          : []

        return {
          id: post.id,
          author: {
            id: post.salon.id,
            name: post.salon.name || "Ismeretlen szalon",
            slug: post.salon.slug || post.salon.id,
            ownerId: post.salon.ownerId,
            avatar: post.salon.profileImage || post.salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
            role: post.salon.categories?.[0] || "SzolgÃ¡ltatÃ³",
            currency: post.salon.currency || "HUF",
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            rating: post.salon.rating || 0,
            reviewCount: post.salon.reviewCount || 0
          },
          isLiked: Boolean(post.isLiked),
          images: Array.isArray(post.images) ? post.images : [],
          layout: post.layout || "grid",
          content: post.content || "",
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0,
          createdAt: new Date(post.createdAt || Date.now())
        }
      })
  }

  return (
    <MainLayout>
      <PageErrorBoundary
        title="A feed nem tudott teljesen betöltődni"
        description="A tartalom egy része hibás vagy hiányos adat miatt nem jeleníthető meg biztonságosan."
      >
        <div className="mx-auto w-full max-w-[640px] space-y-6 pb-10 lg:pt-10">
          <div>
            <div className="pb-2">
              <div className="rounded-2xl bg-surface px-5 py-4 shadow-sm border border-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Kiemelt szalonok</p>
                <StoryBar />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold font-serif text-foreground">Legújabb Bejegyzések</h2>
          </div>

          <div className="space-y-8">
            {posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                isOwner={userData?.id === post.author.ownerId}
                onEdit={handleEditPost}
                onLike={handleToggleLike}
              />
            ))}

            {loading && posts.length === 0 && (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] w-full rounded-3xl bg-gray-100 animate-pulse" />)}
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Nincs megjeleníthető bejegyzés</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Jelenleg nincs olyan tartalom, amit ezekkel a szűrőkkel biztonságosan meg tudnánk jeleníteni.
                </p>
              </div>
            )}

            {hasMore && posts.length > 0 && (
              <div ref={sentinelRef} id="scroll-sentinel" className="h-10 flex justify-center items-center">
                {isFetchingMore && <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 font-medium">You've reached the end of elegance</p>
              </div>
            )}
          </div>
        </div>
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
      </PageErrorBoundary>
    </MainLayout>
  )
}
