import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(request: NextRequest) {
    const token = await getToken({ req: request })
    const { pathname } = request.nextUrl

    if (!token) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        url.searchParams.set("authRequired", "true")
        return NextResponse.redirect(url)
    }

    const role = token.role as string | undefined

    if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        url.searchParams.set("forbidden", "true")
        return NextResponse.redirect(url)
    }

    if (pathname.startsWith("/salon") && role !== "provider" && role !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        url.searchParams.set("forbidden", "true")
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard/:path*", "/salon/:path*"],
}
