export interface SalonPagePost {
  id: string
  content: string
  images: string[]
  layout?: string
  createdAt: string | Date
  _count?: {
    likes: number
    comments: number
  }
  isLiked?: boolean
}

export interface SalonPageReview {
  id: string
  rating: number
  comment: string
  createdAt: string | Date
  user?: {
    name?: string | null
    image?: string | null
  } | null
}

export interface SalonPageService {
  id: string
  name: string
  price: string | number
  duration: string | number
  description?: string | null
}

export interface SalonPageTeamMember {
  id: string
  name: string
  role?: string | null
  description?: string | null
  image?: string | null
}

export interface SalonPageOpeningHour {
  day: string
  isOpen: boolean
  open?: string | null
  close?: string | null
}

export interface SalonPageData {
  id: string
  name: string
  slug: string
  ownerId: string
  categories?: string[]
  rating?: number | null
  reviewCount?: number | null
  country?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  images?: string[]
  posts: SalonPagePost[]
  reviews?: SalonPageReview[]
  services?: SalonPageService[]
  currency?: string | null
  isTeam?: boolean
  ownerImage?: string | null
  ownerName?: string | null
  aboutMe?: string | null
  teamMembers?: SalonPageTeamMember[]
  profileImage?: string | null
  coverImage?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  showPhoneOnProfile?: boolean
  showEmailOnProfile?: boolean
  allowMessages?: boolean
  allowBookings?: boolean
  openingHours?: SalonPageOpeningHour[]
  lat?: number | null
  lng?: number | null
}
