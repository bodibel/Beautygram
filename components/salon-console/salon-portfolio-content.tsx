"use client"

import { useState } from "react"
import { toast } from "sonner"

import { PostsCard } from "@/components/salon/cards/PostsCard"
import { PostModal } from "@/components/salon/modals/PostModal"
import { useSalonData } from "@/hooks/useSalonData"
import { createPost, deletePost, updatePost } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { Post } from "@/lib/salon-types"

export function SalonPortfolioContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const { salon, posts, setPosts, loading } = useSalonData(salonId, userData?.id)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  const handleSavePost = async (content: string, imageUrls: string[], layout: string) => {
    try {
      if (editingPost) {
        await updatePost(editingPost.id, { content, images: imageUrls, layout })
        setPosts(posts.map((post) =>
          post.id === editingPost.id ? { ...post, content, images: imageUrls, layout } : post
        ))
        toast.success("Bejegyzés frissítve!")
      } else {
        const newPost = await createPost({
          salonId,
          content,
          images: imageUrls,
          layout,
        })
        setPosts((previousPosts) => {
          if (previousPosts.some((post) => post.id === newPost.id)) return previousPosts
          return [newPost, ...previousPosts]
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
        setPosts(posts.filter((post) => post.id !== postId))
        toast.success("Bejegyzés törölve!")
      } catch (error) {
        console.error("Error deleting post:", error)
        toast.error("Hiba történt a törlés során!")
      }
    }
  }

  const formatDate = (dateValue: string | Date) => {
    if (!dateValue) return ""
    const date = new Date(dateValue)
    return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-muted-foreground">Betöltés...</div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-screen space-y-8 p-6">
      <h1 className="mb-6 text-3xl font-bold">Portfólió</h1>
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
    </div>
  )
}
