"use client";
import React from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function UserHeader() {
  const router = useRouter();
  const { user, credit, loading } = useAuth();

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🚨 Logout error:', error.message);
      } else {
        localStorage.clear();
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('🚨 Logout error:', error);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full animated-gradient-bg shadow-md py-2 px-4 sm:px-6 flex items-center justify-between z-40"
      style={{ position: "relative" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
          className="text-white text-base font-medium"
          style={{ fontFamily: "Kanit, sans-serif" }}
        >
          🎟️ สิงโตทองคำ 77
        </motion.div>
      </Link>
      <div className="flex items-center gap-3">
        {loading ? (
          <>
            <Skeleton className="w-24 h-5 rounded-md" />
            <Skeleton className="w-28 h-5 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </>
        ) : (
          <>
            <motion.div
              initial={{ x: 15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-white text-xs sm:text-sm"
            >
              👤 {user?.user_metadata?.name || user?.email?.split('@')[0]}
            </motion.div>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-white/15 px-3 py-0.5 rounded-full text-white text-xs sm:text-sm shadow-sm"
            >
              💰 เครดิต: <span className="font-semibold text-red-200">{credit?.toLocaleString() ?? "0"}</span>
            </motion.div>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 hover:text-white p-2 rounded-full transition-all duration-200"
                title="ออกจากระบบ"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </motion.header>
  );
}