export interface Service {
    id: string
    name: string
    price: string
    duration: string
    description?: string
}

export interface OpeningHour {
    id?: string
    day: string
    open: string | null
    close: string | null
    isOpen: boolean
}

export interface ClosedDate {
    id: string
    date: string
    reason: string
}

export interface Post {
    id: string
    content: string
    images?: string[]
    layout?: string
    createdAt: string | Date
    _count?: {
        likes: number
        comments: number
    }
    isLiked?: boolean
    author?: {
        id: string
        name: string
        avatar: string
        role: string
        currency?: string
        minPrice?: number
        rating?: number
        reviewCount?: number
    }
}

export interface Salon {
    id: string
    name: string
    slug: string
    country: string
    city: string
    district?: string
    street?: string
    houseNumber?: string
    floor?: string
    door?: string
    zipCode?: string
    address: string
    categories: string[]
    currency: string
    description?: string
    ownerId: string
    rating: number
    reviewCount: number
    images?: string[]
    profileImage?: string
    coverImage?: string
    email?: string
    phone?: string
    website?: string
    allowBookings?: boolean
    languages?: string[]
    lat?: number
    lng?: number
    // Team/About fields
    ownerName?: string
    ownerImage?: string
    aboutMe?: string
    isTeam?: boolean
    teamMembers?: TeamMember[]
}

export interface TeamMember {
    id: string
    name: string
    role?: string
    description?: string
    image?: string
    order?: number
}

export interface Booking {
    id: string
    date: string | Date
    time: string
    status: string
    userId: string
    salonId: string
    serviceId: string
    createdAt: string | Date
}

export interface Message {
    id: string
    subject?: string
    content: string
    senderId: string
    receiverId: string
    isRead: boolean
    createdAt: string | Date
}


export const CURRENCIES = [
    { code: "HUF", symbol: "Ft", name: "Forint" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "USD", symbol: "$", name: "Dollar" },
    { code: "GBP", symbol: "£", name: "Font" },
    { code: "RON", symbol: "lei", name: "Lej" },
]
