// app/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allowlist: ไม่ต้อง login สำหรับ path เหล่านี้
  const allowlist = [
    "/login",
    "/signup",
    "/favicon.ico",
    "/robots.txt",
  ];
  const isPublic =
    allowlist.includes(req.nextUrl.pathname) ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/public") ||
    req.nextUrl.pathname.startsWith("/assets");

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // ตรวจสอบสิทธิ์ admin เฉพาะ /admin
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()
    if (!userRole || userRole.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/(.*)"] // apply กับทุก route
}