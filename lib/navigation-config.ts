import type React from "react"
import {
  BarChart3,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Filter,
  Heart,
  Home,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  Settings,
  Star,
  Store,
  User,
  Users,
} from "lucide-react"

export type NavMatch = "exact" | "prefix"

export interface NavLink {
  href?: string
  label: string
  icon: React.ElementType
  onClick?: () => void
  badge?: "unread-messages"
  match?: NavMatch
}

export type DashboardSalonSection =
  | "overview"
  | "bookings"
  | "profile"
  | "services"
  | "portfolio"
  | "hours"
  | "team"
  | "messages"

const dashboardSalonSections: Record<DashboardSalonSection, string> = {
  overview: "",
  bookings: "/bookings",
  profile: "/profile",
  services: "/services",
  portfolio: "/portfolio",
  hours: "/hours",
  team: "/team",
  messages: "/messages",
}

export function isNavActive(pathname: string, item: Pick<NavLink, "href" | "match">) {
  if (!item.href) return false
  if ((item.match ?? "prefix") === "exact") return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function getDashboardSalonHref(salonId: string, section: DashboardSalonSection = "overview") {
  return `/dashboard/salons/${salonId}${dashboardSalonSections[section]}`
}

export function getDashboardSalonLinks(salonId: string): NavLink[] {
  return [
    { href: getDashboardSalonHref(salonId), label: "Áttekintés", icon: BarChart3, match: "exact" },
    { href: getDashboardSalonHref(salonId, "bookings"), label: "Foglalási kérelmek", icon: Calendar, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "profile"), label: "Szalonprofil", icon: Info, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "services"), label: "Szolgáltatások", icon: Briefcase, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "portfolio"), label: "Portfólió", icon: FileText, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "hours"), label: "Nyitvatartás", icon: Clock, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "team"), label: "Csapat", icon: Users, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "messages"), label: "Üzenetek", icon: MessageSquare, badge: "unread-messages", match: "prefix" },
  ]
}

export function getDashboardSalonBottomLinks(salonId: string): NavLink[] {
  return [
    { href: getDashboardSalonHref(salonId), label: "Áttekintés", icon: Home, match: "exact" },
    { href: getDashboardSalonHref(salonId, "bookings"), label: "Kérelmek", icon: Calendar, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "profile"), label: "Profil", icon: Info, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "services"), label: "Szolgált.", icon: Briefcase, match: "prefix" },
    { href: getDashboardSalonHref(salonId, "portfolio"), label: "Portfólió", icon: ImageIcon, match: "prefix" },
  ]
}

export function getLegacySalonConsoleHref(salonId: string, section: DashboardSalonSection = "overview") {
  const legacySections: Record<DashboardSalonSection, string> = {
    overview: "",
    bookings: "/bookings",
    profile: "/settings",
    services: "/services",
    portfolio: "/posts",
    hours: "/hours",
    team: "/team",
    messages: "",
  }

  if (section === "messages") {
    return `/dashboard/messages?salon=${encodeURIComponent(salonId)}`
  }

  return `/salon/${salonId}${legacySections[section]}`
}

export const visitorLinks: NavLink[] = [
  { href: "/", label: "Inspiráció", icon: LayoutGrid, match: "exact" },
  { href: "/providers", label: "Keresés", icon: Users, match: "prefix" },
]

export const authLinks: NavLink[] = [
  { href: "/dashboard", label: "Áttekintés", icon: LayoutGrid, match: "exact" },
  { href: "/dashboard/bookings", label: "Foglalásaim", icon: Calendar, match: "prefix" },
  { href: "/dashboard/messages", label: "Üzenetek", icon: MessageSquare, badge: "unread-messages", match: "prefix" },
  { href: "/dashboard/favorites", label: "Kedvencek", icon: Heart, match: "prefix" },
  { href: "/dashboard/account", label: "Profil és beállítások", icon: User, match: "prefix" },
]

export const loggedInVisitorLinks: NavLink[] = []

export const providerLinks: NavLink[] = [
  { href: "/dashboard/provider", label: "Provider", icon: Briefcase, match: "prefix" },
  { href: "/dashboard/salons", label: "Szalonjaim", icon: Store, match: "prefix" },
]

export const adminLinks: NavLink[] = [
  { href: "/dashboard/admin/overview", label: "Admin áttekintés", icon: BarChart3, match: "exact" },
  { href: "/dashboard/admin/providers", label: "Szolgáltatók", icon: Briefcase, match: "prefix" },
  { href: "/dashboard/admin/visitors", label: "Látogatók", icon: Users, match: "prefix" },
  { href: "/dashboard/admin/audit-log", label: "Eseménynapló", icon: ScrollText, match: "prefix" },
  { href: "/dashboard/admin/settings", label: "Beállítások", icon: Settings, match: "prefix" },
]

export function getSalonLinks(salonId: string): NavLink[] {
  return [
    { href: `/salon/${salonId}`, label: "Áttekintés", icon: BarChart3, match: "exact" },
    { href: `/salon/${salonId}/bookings`, label: "Foglalási kérelmek", icon: Calendar, match: "prefix" },
    { href: `/salon/${salonId}/settings`, label: "Szalon adatai", icon: Info, match: "prefix" },
    { href: `/salon/${salonId}/services`, label: "Szolgáltatások", icon: Briefcase, match: "prefix" },
    { href: `/salon/${salonId}/posts`, label: "Portfólió", icon: FileText, match: "prefix" },
    { href: `/salon/${salonId}/gallery`, label: "Galéria", icon: ImageIcon, match: "prefix" },
    { href: `/salon/${salonId}/team`, label: "Csapat", icon: Users, match: "prefix" },
    { href: `/salon/${salonId}/hours`, label: "Nyitvatartás", icon: Clock, match: "prefix" },
    { href: `/salon/${salonId}/reviews`, label: "Vélemények", icon: Star, match: "prefix" },
    { href: `/salon/${salonId}/contact`, label: "Beállítások", icon: Settings, match: "prefix" },
    { href: "/dashboard/messages", label: "Üzenetek", icon: MessageSquare, badge: "unread-messages", match: "prefix" },
  ]
}

export function getSalonBottomLinks(salonId: string): NavLink[] {
  return [
    { href: `/salon/${salonId}`, label: "Áttekintés", icon: Home, match: "exact" },
    { href: `/salon/${salonId}/bookings`, label: "Kérelmek", icon: Calendar, match: "prefix" },
    { href: `/salon/${salonId}/settings`, label: "Adatok", icon: Info, match: "prefix" },
    { href: `/salon/${salonId}/services`, label: "Szolgált.", icon: Briefcase, match: "prefix" },
    { href: `/salon/${salonId}/posts`, label: "Portfólió", icon: ImageIcon, match: "prefix" },
  ]
}

export function getDashboardBottomLinks(): NavLink[] {
  return [
    { href: "/dashboard", label: "Áttekintés", icon: Home, match: "exact" },
    { href: "/dashboard/bookings", label: "Foglalásaim", icon: Calendar, match: "prefix" },
    { href: "/dashboard/messages", label: "Üzenetek", icon: MessageSquare, match: "prefix" },
    { href: "/dashboard/favorites", label: "Kedvencek", icon: Heart, match: "prefix" },
  ]
}

export function getNavLinks(
  role: string | undefined,
  isSalonContext: boolean,
  salonId: string | undefined,
  isLoggedIn: boolean,
  openFilters?: () => void,
  useDashboardSalonRoutes = false
): NavLink[] {
  if (isSalonContext && salonId) {
    return useDashboardSalonRoutes ? getDashboardSalonLinks(salonId) : getSalonLinks(salonId)
  }
  if (role === "admin") return [...authLinks, ...providerLinks, ...adminLinks]
  if (role === "provider") return [...authLinks, ...providerLinks]
  if (isLoggedIn) return [...authLinks, ...loggedInVisitorLinks]

  const links: NavLink[] = [...visitorLinks]
  if (openFilters) {
    links.push({ label: "Szűrők", icon: Filter, onClick: openFilters })
  }
  return links
}
