"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import { AdminLayout } from "@/components/admin-layout"

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<null | boolean>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('❌ No user found, redirecting to login');
          router.replace("/login");
          return;
        }

        console.log('👤 User found:', user.email);

        // 1. ลองดึง role จากตาราง user_roles ก่อน
        const { data: userRow, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        let role = userRow?.role;
        
        // 2. ถ้าไม่มี role ในตาราง user_roles ให้ fallback ไป user_metadata
        if (!role) {
          role = user.user_metadata?.role;
        }

        console.log('🔍 User role from admin layout:', role);

        if (role !== "admin") {
          console.log('🚫 Not admin, redirecting to homepage');
          router.replace("/homepage");
          setIsAdmin(false);
        } else {
          console.log('✅ Admin access granted');
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('🚨 Error checking admin access:', error);
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // แสดง loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
          <span className="text-lg text-foreground font-semibold">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</span>
        </div>
      </div>
    );
  }

  // ถ้าไม่ใช่ admin ให้แสดงข้อความแจ้งเตือน
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>
}
