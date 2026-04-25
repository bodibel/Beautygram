"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Plus, Trash2 } from "lucide-react"
import { Post } from "@/lib/salon-types"

interface PostsCardProps {
    posts: Post[]
    onAddPost: () => void
    onEditPost: (post: Post) => void
    onDeletePost: (postId: string) => void
    formatDate: (timestamp: any) => string
    onOpenPost: (post: Post) => void
}

export function PostsCard({
    posts,
    onAddPost,
    onEditPost,
    onDeletePost,
    formatDate,
    onOpenPost,
}: PostsCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <CardTitle>Bejegyzések</CardTitle>
                        <CardDescription>Oszd meg az újdonságokat az ügyfelekkel</CardDescription>
                    </div>
                    <Button onClick={onAddPost} size="sm" className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Új bejegyzés
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {posts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        Még nincs bejegyzés hozzáadva
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onOpenPost(post)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        onOpenPost(post)
                                    }
                                }}
                                className="w-full cursor-pointer rounded-lg border p-4 text-left transition-colors hover:bg-primary-subtle"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                                        {post.images && post.images.length > 0 ? (
                                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100 sm:h-24 sm:w-24">
                                                <img
                                                    src={post.images[0]}
                                                    alt="Post thumbnail"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : null}

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm whitespace-pre-wrap break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] overflow-hidden sm:[display:block] sm:[-webkit-line-clamp:unset]">
                                                {post.content}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-shrink-0 items-center justify-end gap-2 sm:ml-2 sm:flex-col sm:items-stretch">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEditPost(post)
                                            }}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeletePost(post.id)
                                            }}
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
