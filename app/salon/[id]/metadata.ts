import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    await params

    // TODO: Fetch salon data from Firebase to get actual name
    return {
        title: "Szalon Kezelése",
        description: "Kezeld a szalonod szolgáltatásait, képeit és nyitvatartását",
    }
}
