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

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่และมีสิทธิ์ admin หรือไม่
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!session) {
      // ถ้าไม่ได้เข้าสู่ระบบ ให้ redirect ไปยังหน้าเข้าสู่ระบบ
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ admin หรือไม่
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()

    if (!userRole || userRole.role !== "admin") {
      // ถ้าไม่มีสิทธิ์ admin ให้ redirect ไปยังหน้าหลัก
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/admin/:path*"],
}