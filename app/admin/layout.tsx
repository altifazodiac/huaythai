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
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log(user); // ดู user_metadata หรือ role
      if (!user) {
        router.replace("/login");
        return;
      }
      // สมมติ role อยู่ใน user.user_metadata.role
      const role = user.user_metadata?.role;
      if (role !== "admin") {
        router.replace("/"); // หรือ redirect ไปหน้าอื่น
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
