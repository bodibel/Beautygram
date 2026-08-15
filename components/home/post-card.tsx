"use client"

import { useState } from "react"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"

interface PostCardProps {
    id: string
    author: {
        id: string
        name: string
        avatar: string
        role: string
        slug: string
    }
    images: string[]
    content: string
    likes: number
    comments: number
    createdAt?: string | Date
}

export function PostCard({ author, images, content, likes }: PostCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isLiked, setIsLiked] = useState(false)

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <div className="relative h-10 w-10 overflow-hidden rounded-full cursor-pointer" onClick={() => window.location.href = `/profile/${author.slug}`}>
                    <SafeImage
                        src={author.avatar || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"}
                        alt={author.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                        fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=random`}
                    />
                </div>
                <div className="flex flex-col">
                    <span className="font-semibold cursor-pointer hover:text-primary" onClick={() => window.location.href = `/profile/${author.slug}`}>{author.name}</span>
                    <span className="text-xs text-muted-foreground">{author.role}</span>
                </div>
            </CardHeader>
            <div className="relative aspect-square w-full bg-muted">
                {images && images.length > 0 ? (
                    <>
                        <SafeImage src={images[currentImageIndex]} alt="Post content" fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={false} />
                        {images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/20 backdrop-blur-md rounded-full">
                                {images.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentImageIndex ? "bg-white scale-125" : "bg-white/50"}`}
                                        onClick={() => setCurrentImageIndex(i)}
                                    />
                                ))}
                            </div>
                        )}
                        {images.length > 1 && (
                            <div className="absolute inset-y-0 inset-x-0 flex justify-between items-center px-2 opacity-0 hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)) }}
                                    className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)) }}
                                    className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white"
                                >
                                    ›
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">Nincs kép</div>
                )}
            </div>
            <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-2">
                    <Button variant="ghost" size="icon" className={`hover:text-primary ${isLiked ? "text-primary" : ""}`} onClick={() => setIsLiked(!isLiked)}>
                        <Heart className={`h-6 w-6 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-blue-600">
                        <MessageCircle className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="ml-auto hover:text-green-600">
                        <Share2 className="h-6 w-6" />
                    </Button>
                </div>
                <div className="font-semibold text-sm mb-1">{isLiked ? likes + 1 : likes} kedvelés</div>
                <p className="text-sm">
                    <span className="font-semibold mr-2">{author.name}</span>
                    {content}
                </p>
            </CardContent>
        </Card>
    )
}
