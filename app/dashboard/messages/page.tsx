"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Send, User, MessageSquare, ShieldCheck, Mail, Inbox } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getUserMessages, sendMessage, markMessageAsRead, getAdminUser } from "@/lib/actions/salon"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { AccountEmptyState } from "@/components/account/account-empty-state"

interface Thread {
    id: string
    otherUser: {
        id: string
        name: string | null
        image: string | null
    }
    lastMessage: any
    messages: any[]
    unreadCount: number
}

export default function MessagesPage() {
    const { userData } = useAuth()
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState("")
    const [sending, setSending] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [admin, setAdmin] = useState<{ id: string; name: string; image: string | null } | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const loadMessages = useCallback(async (shouldScroll = false) => {
        if (!userData?.id) return
        try {
            const data = await getUserMessages(userData.id)
            setMessages(data)
            if (shouldScroll) {
                setTimeout(scrollToBottom, 100)
            }
        } catch (error) {
            console.error("Error loading messages:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    const loadAdmin = async () => {
        const adminUser = await getAdminUser()
        if (adminUser) {
            setAdmin(adminUser as any)
        }
    }

    useEffect(() => {
        if (userData?.id) {
            loadMessages(true)
            loadAdmin()

            const interval = setInterval(() => {
                loadMessages()
            }, 5000)

            return () => clearInterval(interval)
        }
    }, [userData?.id, loadMessages])

    const threads: Thread[] = []
    const messagesMap = new Map<string, any[]>()

    messages.forEach((msg) => {
        const otherUserId = msg.senderId === userData?.id ? msg.receiverId : msg.senderId
        if (!messagesMap.has(otherUserId)) {
            messagesMap.set(otherUserId, [])
        }
        messagesMap.get(otherUserId)?.push(msg)
    })

    messagesMap.forEach((msgs, otherUserId) => {
        const sortedMsgs = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        const lastMsg = sortedMsgs[sortedMsgs.length - 1]
        const otherUser = lastMsg.senderId === userData?.id ? lastMsg.receiver : lastMsg.sender

        threads.push({
            id: otherUserId,
            otherUser,
            lastMessage: lastMsg,
            messages: sortedMsgs,
            unreadCount: msgs.filter((m) => !m.isRead && m.receiverId === userData?.id).length,
        })
    })

    threads.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())

    const filteredThreads = threads.filter((t) =>
        t.otherUser.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    let activeThread = threads.find((t) => t.id === activeThreadId)

    useEffect(() => {
        if (activeThread && userData?.id) {
            const unreadMsgs = activeThread.messages.filter((m) => !m.isRead && m.receiverId === userData.id)
            if (unreadMsgs.length > 0) {
                const readAll = async () => {
                    for (const msg of unreadMsgs) {
                        await markMessageAsRead(msg.id)
                    }
                    loadMessages()
                }
                readAll()
            }
            scrollToBottom()
        }
    }, [activeThread?.messages.length, activeThreadId, userData?.id, loadMessages])

    if (!activeThread && activeThreadId && admin && activeThreadId === admin.id) {
        activeThread = {
            id: admin.id,
            otherUser: {
                id: admin.id,
                name: admin.name,
                image: admin.image,
            },
            lastMessage: { content: "", createdAt: new Date().toISOString() },
            messages: [],
            unreadCount: 0,
        }
    }

    const visibleThreads = filteredThreads.length > 0
        ? filteredThreads
        : activeThread
            ? [activeThread]
            : []
    const shouldShowConversationLayout = visibleThreads.length > 0

    const handleSendReply = async () => {
        if (!userData?.id || !activeThreadId || !replyContent.trim()) return

        setSending(true)
        try {
            await sendMessage({
                senderId: userData.id,
                receiverId: activeThreadId,
                content: replyContent,
                subject: activeThread?.lastMessage.subject || "Válasz",
            })
            setReplyContent("")
            await loadMessages(true)
        } catch (error) {
            console.error("Error sending reply:", error)
            alert("Hiba történt az üzenet küldésekor.")
        } finally {
            setSending(false)
        }
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <AccountPageShell
                    icon={MessageSquare}
                    title="Üzenetek"
                    description="Itt látod a kapott és küldött üzeneteidet."
                >
                    <AccountEmptyState
                        icon={ShieldCheck}
                        title="Bejelentkezés szükséges"
                        description="Az üzeneteid megtekintéséhez kérlek jelentkezz be."
                    />
                </AccountPageShell>
            </MainLayout>
        )
    }

    return (
            <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={MessageSquare}
                title="Üzenetek"
                description="Itt látod a kapott és küldött beszélgetéseidet."
                actions={
                    admin && userData.id !== admin.id ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
                            onClick={() => setActiveThreadId(admin.id)}
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Admin értesítése
                        </Button>
                    ) : null
                }
            >
                <div className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Keresés az üzenetek között..."
                            className="h-11 rounded-xl border-gray-100 bg-white pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                            <div className="h-[480px] animate-pulse rounded-[32px] bg-gray-100" />
                            <div className="h-[480px] animate-pulse rounded-[32px] bg-gray-100" />
                        </div>
                    ) : !shouldShowConversationLayout ? (
                        <Card className="rounded-[32px] border border-dashed border-gray-200 bg-white shadow-sm">
                            <CardContent className="px-6 py-16 sm:px-10">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                                        <Mail className="h-10 w-10 text-gray-300" />
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900">Nincsenek üzenetek</h2>
                                    <p className="mt-2 max-w-md text-sm text-gray-500">
                                        Itt jelennek meg a kapott és küldött beszélgetéseid. Ha valaki ír neked, vagy te indítasz egy beszélgetést, itt fogod látni.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                            <div className="flex min-h-[520px] flex-col">
                                <Card className="flex flex-1 flex-col overflow-hidden rounded-[32px] border-gray-100 shadow-sm">
                                    <CardContent className="flex-1 overflow-y-auto p-0">
                                        <div className="divide-y divide-gray-50">
                                            {visibleThreads.map((thread) => (
                                                <button
                                                    key={thread.id}
                                                    onClick={() => setActiveThreadId(thread.id)}
                                                    className={cn(
                                                        "group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50",
                                                        activeThreadId === thread.id ? "bg-primary-subtle" : ""
                                                    )}
                                                >
                                                    <div className="relative">
                                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                            <AvatarImage src={thread.otherUser.image || ""} />
                                                            <AvatarFallback className="bg-gray-100 text-xs font-bold text-gray-600">
                                                                {thread.otherUser.name?.[0] || <User className="h-4 w-4" />}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {thread.unreadCount > 0 && (
                                                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-bold text-white shadow-sm">
                                                                {thread.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-0.5 flex items-center justify-between">
                                                            <p className={cn(
                                                                "truncate text-sm font-bold",
                                                                thread.unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                                                            )}>
                                                                {thread.otherUser.name || "Ismeretlen"}
                                                            </p>
                                                            <span className="text-[10px] font-medium text-gray-400">
                                                                {thread.lastMessage.createdAt ? format(new Date(thread.lastMessage.createdAt), "HH:mm", { locale: hu }) : ""}
                                                            </span>
                                                        </div>
                                                        <p className={cn(
                                                            "truncate text-xs",
                                                            thread.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-400"
                                                        )}>
                                                            {thread.lastMessage.content}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex min-h-[520px] flex-col">
                                {activeThread ? (
                            <Card className="flex flex-1 flex-col overflow-hidden rounded-[32px] border-gray-100 bg-white shadow-sm">
                                <CardHeader className="sticky top-0 z-10 border-b border-gray-50 bg-white p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-gray-100">
                                            <AvatarImage src={activeThread.otherUser.image || ""} />
                                            <AvatarFallback className="bg-gray-100 text-xs font-bold text-gray-500">
                                                {activeThread.otherUser.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">{activeThread.otherUser.name}</h3>
                                            <p className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Elérhető
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 space-y-6 overflow-y-auto bg-gray-50/30 p-6">
                                    {activeThread.messages.map((msg) => {
                                        const isMine = msg.senderId === userData.id
                                        return (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex max-w-[80%] flex-col",
                                                    isMine ? "ml-auto items-end" : "mr-auto items-start"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "rounded-2xl p-4 text-sm shadow-sm",
                                                        isMine
                                                            ? "rounded-br-none bg-primary text-white"
                                                            : "rounded-bl-none border border-gray-100 bg-white text-gray-700"
                                                    )}
                                                >
                                                    {msg.salon && (
                                                        <span className="mb-2 mr-2 inline-block rounded border border-primary/10 bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                                            {msg.salon.name}
                                                        </span>
                                                    )}
                                                    {msg.subject && (
                                                        <p className={cn(
                                                            "mb-2 inline-block border-b pb-1.5 text-[10px] font-black uppercase tracking-widest opacity-60",
                                                            isMine ? "border-white/20" : "border-gray-100"
                                                        )}>
                                                            {msg.subject}
                                                        </p>
                                                    )}
                                                    <p className="leading-relaxed">{msg.content}</p>
                                                </div>
                                                <span className="mt-1.5 px-1 text-[10px] font-medium text-gray-400">
                                                    {format(new Date(msg.createdAt), "HH:mm | MMM d.", { locale: hu })}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </CardContent>

                                <div className="border-t border-gray-50 bg-white p-4">
                                    <div className="flex items-center gap-2">
                                        <Textarea
                                            placeholder="Válasz írása..."
                                            className="h-[44px] min-h-[44px] flex-1 resize-none rounded-xl border-transparent bg-gray-50/50 px-4 py-3 text-sm transition-all focus:border-primary/10 focus:bg-white"
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSendReply()
                                                }
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            className="h-11 w-11 shrink-0 rounded-xl bg-primary shadow-md shadow-primary/10 transition-all active:scale-90 hover:bg-primary"
                                            disabled={!replyContent.trim() || sending}
                                            onClick={handleSendReply}
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                                ) : (
                                    <Card className="flex flex-1 flex-col items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-white shadow-sm">
                                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                                            <Inbox className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h2 className="text-xl font-black tracking-tight text-gray-800">Válassz ki egy üzenetet</h2>
                                        <p className="mt-1 max-w-xs text-center text-sm font-medium leading-relaxed text-gray-400">
                                            Kattints a bal oldali listából egy beszélgetésre az előzmények megtekintéséhez.
                                        </p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </AccountPageShell>
        </MainLayout>
    )
}
