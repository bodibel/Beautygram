import { PublicDiscoveryLayout } from "@/components/layout/public-discovery-layout"
import { SearchResults, type SearchCategory, type SearchStudio } from "@/components/search/search-results"
import { getCategories } from "@/lib/actions/category"
import { getAllSalons } from "@/lib/actions/salon"

export const dynamic = "force-dynamic"

function getPrimaryImage(salon: {
  coverImage?: string | null
  profileImage?: string | null
  images?: string[] | null
}) {
  return salon.coverImage || salon.images?.[0] || salon.profileImage || null
}

export default async function ProvidersPage() {
  const [salons, categories] = await Promise.all([getAllSalons(), getCategories()])

  const categoryOptions: SearchCategory[] = categories.map((category) => ({
    name: category.name,
    slug: category.slug,
  }))
  const categoryNameBySlug = new Map(categoryOptions.map((category) => [category.slug, category.name]))

  const studios: SearchStudio[] = salons.map((salon) => ({
    id: salon.id,
    name: salon.name,
    slug: salon.slug,
    image: getPrimaryImage(salon),
    profileImage: salon.profileImage || null,
    country: salon.country || null,
    city: salon.city || null,
    district: salon.district || null,
    address: salon.address || null,
    lat: salon.lat ?? null,
    lng: salon.lng ?? null,
    category: salon.categories?.[0] ? categoryNameBySlug.get(salon.categories[0]) || salon.categories[0] : null,
    categories: salon.categories || [],
    rating: salon.rating && salon.rating > 0 ? salon.rating : null,
    reviewCount: salon.reviewCount && salon.reviewCount > 0 ? salon.reviewCount : null,
    description: salon.description || null,
    allowBookings: salon.allowBookings,
  }))

  return (
    <PublicDiscoveryLayout>
      <div className="space-y-8 pb-4">
        <SearchResults studios={studios} categories={categoryOptions} />
      </div>
    </PublicDiscoveryLayout>
  )
}
