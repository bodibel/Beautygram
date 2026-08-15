"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Post } from "@/lib/salon-types"
import Image from "next/image"

interface PostsCardProps {
    posts: Post[]
    onAddPost: () => void
    onEditPost: (post: Post) => void
    onDeletePost: (postId: string) => void
    formatDate: (timestamp: string | Date) => string
}

export function PostsCard({ posts, onAddPost, onEditPost, onDeletePost, formatDate }: PostsCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Bejegyzések</CardTitle>
                        <CardDescription>Oszd meg az újdonságokat az ügyfelekkel</CardDescription>
                    </div>
                    <Button onClick={onAddPost} size="sm" data-testid="portfolio-add-post">
                        <Plus className="mr-2 h-4 w-4" />
                        Új bejegyzés
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {posts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        Még nincs bejegyzés hozzáadva
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div key={post.id} data-testid="portfolio-post-card" className="border rounded-lg p-4 hover:bg-primary-subtle transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Thumbnail - Fixed Size */}
                                    {post.images && post.images.length > 0 && (
                                        <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden bg-gray-100 border">
                                            <Image
                                                src={post.images[0]}
                                                alt="Post thumbnail"
                                                width={96}
                                                height={96}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Content (Text) */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
                                        <p className="text-xs text-muted-foreground mt-2">{formatDate(post.createdAt)}</p>
                                    </div>

                                    {/* Actions (Right Side) */}
                                    <div className="flex flex-col gap-2 flex-shrink-0 ml-2">
                                        <Button variant="ghost" size="icon" onClick={() => onEditPost(post)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                            <Edit className="h-5 w-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDeletePost(post.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600">
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
