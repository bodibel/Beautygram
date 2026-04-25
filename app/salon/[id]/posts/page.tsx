"use client"

import { use, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { createPost, deletePost, updatePost } from "@/lib/actions/salon"
import { useSalonData } from "@/hooks/useSalonData"
import { Post } from "@/lib/salon-types"

import { PostsCard } from "@/components/salon/cards/PostsCard"
import { PostModal } from "@/components/salon/modals/PostModal"
import { toast } from "sonner"
import { PostDetailModal } from "@/components/home/post-detail-modal"

export default function SalonPostsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()

    const { salon, posts, setPosts, loading } = useSalonData(id, userData?.id)

    const [isPostModalOpen, setIsPostModalOpen] = useState(false)
    const [editingPost, setEditingPost] = useState<Post | null>(null)
    const [selectedPost, setSelectedPost] = useState<Post | null>(null)

    const handleSavePost = async (content: string, imageUrls: string[], layout: string) => {
        try {
            if (editingPost) {
                await updatePost(editingPost.id, { content, images: imageUrls, layout })
                setPosts(posts.map((p) => (p.id === editingPost.id ? { ...p, content, images: imageUrls, layout } : p)))
                toast.success("Bejegyzés frissítve!")
            } else {
                const newPost = await createPost({
                    salonId: id,
                    content,
                    images: imageUrls,
                    layout,
                })
                setPosts((prev) => {
                    if (prev.some((p) => p.id === newPost.id)) return prev
                    return [newPost, ...prev]
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

    const handleDeletePost = async (postId: string) => {
        if (confirm("Biztosan törlöd ezt a bejegyzést?")) {
            try {
                await deletePost(postId)
                setPosts(posts.filter((p) => p.id !== postId))
                toast.success("Bejegyzés törölve!")
            } catch (error) {
                console.error("Error deleting post:", error)
                toast.error("Hiba történt a törlés során!")
            }
        }
    }

    const formatDate = (dateValue: any) => {
        if (!dateValue) return ""
        const date = new Date(dateValue)
        return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-5 md:p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon && !loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-4xl px-3 py-4 text-center sm:px-4 sm:py-5 md:p-6 lg:mr-auto">
                    <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
                </div>
            </MainLayout>
        )
    }

    if (!salon) return null

    const selectedPostForModal = selectedPost
        ? {
              id: selectedPost.id,
              author: {
                  id: salon.id,
                  name: salon.name,
                  avatar: salon.profileImage || salon.images?.[0] || "",
                  role: salon.categories?.[0] || "Szalon",
                  slug: (salon as any).slug || salon.id,
                  currency: salon.currency,
                  rating: salon.rating,
                  reviewCount: salon.reviewCount,
              },
              images: selectedPost.images || [],
              content: selectedPost.content,
              likes: selectedPost._count?.likes || 0,
              comments: selectedPost._count?.comments || 0,
              isLiked: selectedPost.isLiked,
              createdAt: new Date(selectedPost.createdAt),
          }
        : null

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-6xl min-h-screen space-y-6 px-3 py-4 sm:space-y-7 sm:px-4 sm:py-5 md:space-y-8 md:p-6 lg:mr-auto">
                <h1 className="mb-4 text-3xl font-bold md:mb-6">Bejegyzések kezelése</h1>

                <PostsCard
                    posts={posts}
                    onAddPost={() => {
                        setEditingPost(null)
                        setIsPostModalOpen(true)
                    }}
                    onEditPost={(post) => {
                        setEditingPost(post)
                        setIsPostModalOpen(true)
                    }}
                    onDeletePost={handleDeletePost}
                    formatDate={formatDate}
                    onOpenPost={setSelectedPost}
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

                {selectedPostForModal ? (
                    <PostDetailModal
                        isOpen={!!selectedPost}
                        onClose={() => setSelectedPost(null)}
                        post={selectedPostForModal}
                    />
                ) : null}
            </div>
        </MainLayout>
    )
}
