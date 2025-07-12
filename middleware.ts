import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;
  
  console.log('🔒 MIDDLEWARE:', pathname);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let user = null;

  try {
    // ตรวจสอบ authentication อย่างปลอดภัย
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    // เฉพาะ error ที่ไม่ใช่ session missing เท่านั้นที่จะ log
    if (authError && !authError.message.includes('Auth session missing')) {
      console.error('🚨 Auth error:', authError.message);
    }
    
    user = authUser;
    
    // Log เฉพาะกรณีที่มี user เพื่อลด noise
    if (user) {
      console.log('👤 User:', user.email);
    } else if (pathname !== '/login' && !pathname.startsWith('/_next')) {
      console.log('👤 Guest user');
    }
    
  } catch (error: any) {
    // ไม่ log error สำหรับ session missing
    if (!error?.message?.includes('Auth session missing')) {
      console.error('🚨 Auth check failed:', error?.message || error);
    }
    // ไม่ throw error เพื่อไม่ให้ middleware หยุดทำงาน
    user = null;
  }
  
  // กำหนด public routes ที่ไม่ต้องตรวจสอบ authentication
  const publicRoutes = [
    '/login',
    '/register', 
    '/api', // ← API routes เป็น public
    '/_next',
    '/favicon.ico',
    '/robots.txt'
  ]
  
  // ตรวจสอบว่าเป็น public route หรือไม่
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // กำหนด protected routes
  const protectedRoutes = ['/homepage', '/lottery-ticket', '/lottery-orders', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // ถ้าเป็น protected route แต่ไม่มี user ให้ redirect ไป login
  if (isProtectedRoute && !user) {
    console.log('🚫 Protected route -> redirecting to login');
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // ถ้าเป็น public route ให้ผ่านไปได้เลย
  if (isPublicRoute) {
    console.log('✅ Public route -> allowing access');
    return response
  }
  
  // ถ้าเป็นหน้า login หรือ auth routes แต่มี user แล้ว ให้ redirect ไป homepage
  if ((pathname === '/login' || pathname.startsWith('/login')) && user) {
    console.log('✅ User logged in -> redirecting to homepage');
    const mainUrl = new URL('/homepage', request.url)
    return NextResponse.redirect(mainUrl)
  }

  const processingTime = Date.now() - startTime;
  console.log(`⏱️ ${processingTime}ms`);

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
