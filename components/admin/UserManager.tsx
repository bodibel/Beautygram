"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    getAllUsers,
    updateUserAdmin,
    deleteUserAdmin,
    toggleUserRole,
    toggleUserActiveAdmin
} from "@/lib/actions/user"
import {
    Edit2,
    Trash2,
    RefreshCw,
    Search,
    User as UserIcon,
    Mail,
    BadgeCheck,
    ChevronDown,
    ChevronUp,
    Store,
    UserCog,
    Power,
    PowerOff
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface UserManagerProps {
    filterRole?: string;
    title: string;
    description: string;
}

type ManagedSalon = {
    id: string
    name: string
}

type ManagedUser = {
    id: string
    name: string | null
    email: string | null
    image?: string | null
    role: "admin" | "provider" | "visitor" | string
    isActive: boolean
    salons?: ManagedSalon[]
}

export function UserManager({ filterRole, title, description }: UserManagerProps) {
    const [users, setUsers] = useState<ManagedUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
    const [editData, setEditData] = useState({ name: "", email: "", role: "" })
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const loadUsers = useCallback(async () => {
        setLoading(true)
        const result = await getAllUsers()
        if (result.success) {
            setUsers(result.users || [])
        } else {
            toast.error(result.error || "Hiba a felhasználók betöltésekor")
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        const timer = window.setTimeout(() => void loadUsers(), 0)
        return () => window.clearTimeout(timer)
    }, [loadUsers])

    const filteredUsers = users.filter(user => {
        const matchesRole = !filterRole || user.role === filterRole
        const matchesSearch =
            (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
        return matchesRole && matchesSearch
    })

    const handleRowClick = (userId: string) => {
        setExpandedUserId(expandedUserId === userId ? null : userId)
    }

    const handleEdit = (user: ManagedUser) => {
        setSelectedUser(user)
        setEditData({
            name: user.name || "",
            email: user.email || "",
            role: user.role
        })
        setIsEditModalOpen(true)
    }

    const handleUpdate = async () => {
        if (!selectedUser) return
        setActionLoading("edit")
        const result = await updateUserAdmin(selectedUser.id, editData)
        if (result.success) {
            toast.success("Felhasználó frissítve")
            setIsEditModalOpen(false)
            loadUsers()
        } else {
            toast.error(result.error)
        }
        setActionLoading(null)
    }

    const handleDelete = async (userId: string, userName: string) => {
        if (!confirm(`Biztosan törölni szeretnéd "${userName || "Névtelen"}" felhasználót?\n\nEz a művelet NEM visszavonható! A felhasználó összes adata (szalonok, posztok, foglalások, értékelések) véglegesen törlődik.`)) return

        setActionLoading(userId)
        const result = await deleteUserAdmin(userId)
        if (result.success) {
            toast.success("Felhasználó véglegesen törölve")
            setExpandedUserId(null)
            loadUsers()
        } else {
            toast.error(result.error)
        }
        setActionLoading(null)
    }

    const handleToggleRole = async (userId: string) => {
        setActionLoading(userId)
        const result = await toggleUserRole(userId)
        if (result.success) {
            toast.success(`Szerepkör módosítva: ${result.newRole === 'provider' ? 'Szolgáltató' : 'Látogató'}`)
            loadUsers()
        } else {
            toast.error(result.error)
        }
        setActionLoading(null)
    }

    const handleToggleActive = async (userId: string, isCurrentlyActive: boolean) => {
        const action = isCurrentlyActive ? "deaktiválni" : "aktiválni"
        if (!confirm(`Biztosan szeretnéd ${action} ezt a fiókot?${isCurrentlyActive ? "\n\nA felhasználó szalonjai és posztjai is deaktiválódnak." : ""}`)) return

        setActionLoading(userId)
        const result = await toggleUserActiveAdmin(userId)
        if (result.success) {
            toast.success(result.isActive ? "Fiók aktiválva" : "Fiók deaktiválva")
            loadUsers()
        } else {
            toast.error(result.error)
        }
        setActionLoading(null)
    }

    const getRoleBadge = (role: string) => {
        const styles = {
            admin: "bg-blue-100 text-blue-700",
            provider: "bg-primary/10 text-primary",
            visitor: "bg-gray-100 text-gray-700"
        }
        const labels = {
            admin: "Admin",
            provider: "Szolgáltató",
            visitor: "Látogató"
        }
        return (
            <span className={`text-[11px] font-semibold uppercase py-0.5 px-2.5 rounded-full ${styles[role as keyof typeof styles] || styles.visitor}`}>
                {labels[role as keyof typeof labels] || role}
            </span>
        )
    }

    const getStatusBadge = (isActive: boolean) => (
        <span className={`text-[11px] font-semibold py-0.5 px-2.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {isActive ? "Aktív" : "Inaktív"}
        </span>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{filteredUsers.length} felhasználó</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Keresés név vagy email alapján..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <div className="animate-pulse">Adatok betöltése...</div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                Nincs találat a megadott feltételekkel.
                            </div>
                        ) : (
                            filteredUsers.map((user) => {
                                const isExpanded = expandedUserId === user.id
                                const isDisabled = actionLoading === user.id

                                return (
                                    <div key={user.id} className={`transition-colors ${!user.isActive ? "bg-red-50/40" : ""}`}>
                                        {/* Row */}
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
                                            onClick={() => handleRowClick(user.id)}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 ${user.isActive ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-400"}`}>
                                                    {user.image ? (
                                                        <Image src={user.image} alt={user.name || ""} fill sizes="40px" className="h-full w-full object-cover" />
                                                    ) : (
                                                        user.name?.charAt(0)?.toUpperCase() || <UserIcon size={20} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold flex items-center gap-2 truncate">
                                                        {user.name || "Névtelen"}
                                                        {user.role === "admin" && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                                                        {!user.isActive && <span className="text-[10px] text-red-500 font-normal">(inaktív)</span>}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground truncate">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <div className="hidden md:flex items-center gap-2">
                                                    {getRoleBadge(user.role)}
                                                    {getStatusBadge(user.isActive)}
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Detail */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t bg-gray-50/50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                    {/* User info */}
                                                    <div className="space-y-3">
                                                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Felhasználó adatai</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span className="font-medium">Név:</span> {user.name || "Nincs megadva"}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span className="font-medium">Email:</span> {user.email}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span className="font-medium">Szerepkör:</span> {getRoleBadge(user.role)}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Power className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span className="font-medium">Státusz:</span> {getStatusBadge(user.isActive)}
                                                            </div>
                                                            {(user.salons?.length || 0) > 0 && (
                                                                <div className="flex items-start gap-2">
                                                                    <Store className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <span className="font-medium">Szalonok ({user.salons?.length || 0}):</span>
                                                                        <ul className="mt-1 space-y-0.5">
                                                                            {user.salons?.map((salon) => (
                                                                                <li key={salon.id} className="text-muted-foreground">• {salon.name}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="space-y-3">
                                                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Műveletek</h4>
                                                        <div className="space-y-2">
                                                            <Button
                                                                variant="outline"
                                                                className="w-full justify-start gap-2"
                                                                onClick={() => handleEdit(user)}
                                                                disabled={isDisabled}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                                Adatok szerkesztése
                                                            </Button>

                                                            {user.role !== "admin" && (
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                    onClick={() => handleToggleRole(user.id)}
                                                                    disabled={isDisabled}
                                                                >
                                                                    <RefreshCw className="h-4 w-4" />
                                                                    {user.role === "visitor" ? "Szolgáltatóvá alakítás" : "Látogatóvá alakítás"}
                                                                </Button>
                                                            )}

                                                            {user.role !== "admin" && (
                                                                <Button
                                                                    variant="outline"
                                                                    className={`w-full justify-start gap-2 ${user.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                                                                    onClick={() => handleToggleActive(user.id, user.isActive)}
                                                                    disabled={isDisabled}
                                                                >
                                                                    {user.isActive ? (
                                                                        <>
                                                                            <PowerOff className="h-4 w-4" />
                                                                            Fiók deaktiválása
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Power className="h-4 w-4" />
                                                                            Fiók aktiválása
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}

                                                            {user.role !== "admin" && (
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                                                    onClick={() => handleDelete(user.id, user.name || "")}
                                                                    disabled={isDisabled}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Felhasználó végleges törlése
                                                                </Button>
                                                            )}

                                                            {user.role === "admin" && (
                                                                <p className="text-xs text-muted-foreground italic px-1">
                                                                    Admin fiók nem módosítható innen.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Felhasználó szerkesztése</DialogTitle>
                        <DialogDescription>
                            Módosítsd a felhasználó adatait.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Név</Label>
                            <Input
                                id="name"
                                value={editData.name}
                                onChange={(e) => setEditData({...editData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={editData.email}
                                onChange={(e) => setEditData({...editData, email: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Szerepkör</Label>
                            <Select
                                value={editData.role}
                                onValueChange={(value) => setEditData({...editData, role: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Válassz szerepkört" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visitor">Látogató</SelectItem>
                                    <SelectItem value="provider">Szolgáltató</SelectItem>
                                    <SelectItem value="admin">Adminisztrátor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Mégse</Button>
                        <Button
                            onClick={handleUpdate}
                            className="bg-primary hover:bg-primary"
                            disabled={actionLoading === "edit"}
                        >
                            {actionLoading === "edit" ? "Mentés..." : "Mentés"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
