"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // allowlist
    if (["/login", "/signup"].includes(pathname)) return;
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
      }
    };
    checkUser();
  }, [router, pathname]);
} 