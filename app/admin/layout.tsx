"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AdminLayout } from "@/components/admin-layout"

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<null | boolean>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      // 1. ลองดึง role จากตาราง users ก่อน
      const { data: userRow, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      let role = userRow?.role;
      // 2. ถ้าไม่มี role ในตาราง users ให้ fallback ไป user_metadata
      if (!role) {
        role = user.user_metadata?.role;
      }

      if (role !== "admin") {
        router.replace("/");
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    });
  }, [router]);

  if (isAdmin === null) return null; // หรือ loading spinner

  if (!isAdmin) return null; // หรือแสดง error

  return <AdminLayout>{children}</AdminLayout>
}
