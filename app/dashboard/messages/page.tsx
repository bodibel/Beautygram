"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Send, User, ShieldCheck, Mail, Inbox } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getUserMessages, sendMessage, markMessageAsRead, getAdminUser } from "@/lib/actions/salon"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { hu } from "date-fns/locale"

type UserMessage = Awaited<ReturnType<typeof getUserMessages>>[number]
type AdminUser = NonNullable<Awaited<ReturnType<typeof getAdminUser>>>
type ThreadMessage = UserMessage | { content: string; createdAt: string; subject?: string | null }

interface Thread {
    id: string;
    otherUser: {
        id: string;
        name: string | null;
        image: string | null;
    };
    lastMessage: ThreadMessage;
    messages: UserMessage[];
    unreadCount: number;
}

export default function MessagesPage() {
    const { userData } = useAuth()
    const searchParams = useSearchParams()
    const selectedSalonId = searchParams.get("salon")
    const [messages, setMessages] = useState<UserMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState("")
    const [sending, setSending] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [admin, setAdmin] = useState<AdminUser | null>(null)

    // Reference for scrolling
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
            setAdmin(adminUser)
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

    const scopedMessages = useMemo(() => {
        if (!selectedSalonId) return messages
        return messages.filter((message) => message.salonId === selectedSalonId)
    }, [messages, selectedSalonId])

    const selectedSalonName = scopedMessages.find((message) => message.salon?.id === selectedSalonId)?.salon?.name

    const threads: Thread[] = useMemo(() => {
        const groupedThreads: Thread[] = []
        const messagesMap = new Map<string, UserMessage[]>()

        scopedMessages.forEach((message) => {
            const otherUserId = message.senderId === userData?.id ? message.receiverId : message.senderId
            if (!messagesMap.has(otherUserId)) {
                messagesMap.set(otherUserId, [])
            }
            messagesMap.get(otherUserId)?.push(message)
        })

        messagesMap.forEach((threadMessages, otherUserId) => {
            const sortedMessages = [...threadMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            const lastMessage = sortedMessages[sortedMessages.length - 1]
            const otherUser = lastMessage.senderId === userData?.id ? lastMessage.receiver : lastMessage.sender

            groupedThreads.push({
                id: otherUserId,
                otherUser,
                lastMessage,
                messages: sortedMessages,
                unreadCount: threadMessages.filter((message) => !message.isRead && message.receiverId === userData?.id).length
            })
        })

        return groupedThreads.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
    }, [scopedMessages, userData?.id])

    const filteredThreads = threads.filter(t =>
        t.otherUser.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const activeThread = useMemo<Thread | undefined>(() => {
        const thread = threads.find((item) => item.id === activeThreadId)
        if (thread) return thread

        if (activeThreadId && admin && activeThreadId === admin.id) {
            return {
                id: admin.id,
                otherUser: {
                    id: admin.id,
                    name: admin.name,
                    image: admin.image
                },
                lastMessage: { content: "", createdAt: new Date().toISOString() },
                messages: [],
                unreadCount: 0
            }
        }
    }, [activeThreadId, admin, threads])

    useEffect(() => {
        if (!selectedSalonId) return
        if (threads.length === 0) {
            setActiveThreadId(null)
            return
        }
        if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
            setActiveThreadId(threads[0].id)
        }
    }, [activeThreadId, selectedSalonId, threads])

    // Effect to auto-read messages when thread is active and new messages arrive
    useEffect(() => {
        if (activeThread && userData?.id) {
            const unreadMsgs = activeThread.messages.filter(m => !m.isRead && m.receiverId === userData.id)
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
    }, [activeThread, loadMessages, userData?.id])

    const handleSendReply = async () => {
        if (!userData?.id || !activeThreadId || !replyContent.trim()) return

        setSending(true)
        try {
            await sendMessage({
                senderId: userData.id,
                receiverId: activeThreadId,
                content: replyContent,
                subject: activeThread?.lastMessage.subject || "Válasz",
                salonId: selectedSalonId || activeThread?.messages[0]?.salonId || undefined,
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

    const handleSelectThread = async (threadId: string) => {
        setActiveThreadId(threadId)
    }

    const handleMessageAdmin = () => {
        if (!admin) {
            alert("Sajnáljuk, az adminisztrátor jelenleg nem elérhető.")
            return
        }
        setActiveThreadId(admin.id)
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-2 py-2 sm:px-0">
                    <Card className="max-w-md w-full text-center p-8 space-y-4">
                        <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto text-primary">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold">Bejelentkezés szükséges</h2>
                        <p className="text-muted-foreground">Az üzeneteid megtekintéséhez kérlek jelentkezz be.</p>
                        <Button className="w-full bg-primary hover:bg-primary">Bejelentkezés</Button>
                    </Card>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto h-[calc(100vh-6rem)] w-full max-w-6xl px-2 py-2 sm:px-0">
                <div className={cn("flex h-full flex-col gap-6", !loading && filteredThreads.length === 0 ? "items-center" : "md:flex-row")}>
                    {/* Sidebar: Thread List */}
                    <div className={cn("flex h-full w-full flex-col gap-4", !loading && filteredThreads.length === 0 ? "max-w-xl" : "md:w-[350px]")}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Üzenetek</h1>
                                {selectedSalonId && (
                                    <p className="mt-1 text-xs font-bold text-primary">
                                        {selectedSalonName ? `${selectedSalonName} szalon üzenetei` : "Szalonhoz kapcsolt üzenetek"}
                                    </p>
                                )}
                            </div>
                            {admin && userData.id !== admin.id && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs font-bold gap-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3"
                                    onClick={handleMessageAdmin}
                                >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Admin értesítése
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Keresés az üzenetek között..."
                                className="pl-10 h-11 bg-white border-gray-100 rounded-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Card className="flex-1 overflow-hidden border-gray-100 shadow-sm rounded-2xl flex flex-col">
                            <CardContent className="p-0 flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        <p className="text-sm text-gray-400">Betöltés...</p>
                                    </div>
                                ) : filteredThreads.length > 0 ? (
                                    <div className="divide-y divide-gray-50">
                                        {filteredThreads.map(thread => (
                                            <button
                                                key={thread.id}
                                                data-testid={`message-thread-${thread.id}`}
                                                onClick={() => handleSelectThread(thread.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 group",
                                                    activeThreadId === thread.id ? "bg-primary-subtle" : ""
                                                )}
                                            >
                                                <div className="relative">
                                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                        <AvatarImage src={thread.otherUser.image || ""} alt={thread.otherUser.name || ""} />
                                                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-bold">
                                                            {thread.otherUser.name?.[0] || <User className="h-4 w-4" />}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {thread.unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                            {thread.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <p className={cn(
                                                            "text-sm font-bold truncate",
                                                            thread.unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                                                        )}>
                                                            {thread.otherUser.name || "Ismeretlen"}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {thread.lastMessage.createdAt ? format(new Date(thread.lastMessage.createdAt), "HH:mm", { locale: hu }) : ""}
                                                        </span>
                                                    </div>
                                                    <p className={cn(
                                                        "text-xs truncate",
                                                        thread.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-400"
                                                    )}>
                                                        {thread.lastMessage.content}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                        <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                                            <Mail className="h-8 w-8 text-gray-200" />
                                        </div>
                                        <h3 className="font-bold text-gray-900">
                                            {selectedSalonId ? "Nincsenek szalonhoz kapcsolt üzenetek" : "Nincsenek üzenetek"}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                                            {selectedSalonId
                                                ? "Ennél a szalonnál még nincs megnyitott beszélgetés."
                                                : "Itt jelennek meg a kapott és küldött üzeneteid."}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content: Message Thread */}
                    {(!loading && filteredThreads.length === 0) ? null : (
                    <div className="flex-1 flex flex-col h-full">
                        {activeThread ? (
                            <Card className="flex-1 overflow-hidden border-gray-100 shadow-sm rounded-2xl flex flex-col bg-white">
                                <CardHeader className="p-4 border-b border-gray-50 bg-white sticky top-0 z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-gray-100">
                                                <AvatarImage src={activeThread.otherUser.image || ""} alt={activeThread.otherUser.name || ""} />
                                                <AvatarFallback className="bg-gray-100 text-gray-500 text-xs font-bold">
                                                    {activeThread.otherUser.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">{activeThread.otherUser.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                                    Elérhető
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                                    {activeThread.messages.map((msg) => {
                                        const isMine = msg.senderId === userData.id
                                        return (
                                            <div
                                                key={msg.id}
                                                data-testid="message-bubble"
                                                className={cn(
                                                    "flex flex-col max-w-[80%]",
                                                    isMine ? "ml-auto items-end" : "mr-auto items-start"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "p-4 rounded-2xl text-sm shadow-sm",
                                                        isMine
                                                            ? "bg-primary text-white rounded-br-none"
                                                            : "bg-white text-gray-700 border border-gray-100 rounded-bl-none"
                                                    )}
                                                >
                                                    {msg.salon && (
                                                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-primary bg-accent px-1.5 py-0.5 rounded mb-2 mr-2 border border-primary/10/50">
                                                            {msg.salon.name}
                                                        </span>
                                                    )}
                                                    {msg.subject && (
                                                        <p className={cn(
                                                            "text-[10px] font-black uppercase tracking-widest mb-2 pb-1.5 border-b opacity-60 inline-block",
                                                            isMine ? "border-white/20" : "border-gray-100"
                                                        )}>
                                                            {msg.subject}
                                                        </p>
                                                    )}
                                                    <p className="leading-relaxed">{msg.content}</p>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium mt-1.5 px-1">
                                                    {format(new Date(msg.createdAt), "HH:mm | MMM d.", { locale: hu })}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </CardContent>

                                <div className="p-4 border-t border-gray-50 bg-white">
                                    <div className="flex items-center gap-2">
                                        <Textarea
                                            placeholder="Válasz írása..."
                                            data-testid="message-reply-input"
                                            className="min-h-[44px] h-[44px] flex-1 resize-none bg-gray-50/50 border-transparent focus:border-primary/10 focus:bg-white rounded-xl transition-all py-3 px-4 text-sm"
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSendReply()
                                                }
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            data-testid="message-reply-submit"
                                            className="h-11 w-11 rounded-xl bg-primary hover:bg-primary shadow-md shadow-primary/10 transition-all active:scale-90 shrink-0"
                                            disabled={!replyContent.trim() || sending}
                                            onClick={handleSendReply}
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="flex-1 flex flex-col items-center justify-center border-gray-100 shadow-sm rounded-2xl bg-white/50 border-dashed">
                                <div className="bg-white rounded-full h-20 w-20 flex items-center justify-center shadow-sm mb-4 border border-gray-50">
                                    <Inbox className="h-10 w-10 text-gray-200" />
                                </div>
                                <h2 className="text-xl font-black text-gray-800 tracking-tight">Válassz ki egy üzenetet</h2>
                                <p className="text-gray-400 text-sm mt-1 max-w-xs text-center leading-relaxed font-medium">
                                    Kattints a bal oldali listából egy beszélgetésre az előzmények megtekintéséhez.
                                </p>
                            </Card>
                        )}
                    </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
