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
import { GalleryVerticalEnd, BookOpen, PieChart, Calendar, Frame, Sun, Moon, Ticket, Settings, ShieldUser } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
 

export default function UserHeader() {
  const router = useRouter();
  const { user, credit, loading } = useAuth();
  const { setTheme } = useTheme();

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
           {/* Theme toggle button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:text-white dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 data-[state=open]:bg-red-100 dark:data-[state=open]:bg-red-700">
              <Sun className="h-5 w-5 rotate-0 scale-100 text-white transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-white transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[130px] z-[9999] bg-red-900 text-slate-100 border-red-700/70 shadow-xl">
            <DropdownMenuItem onClick={() => setTheme("light")}
              className="cursor-pointer flex items-center text-red-700 gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <Sun className="h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <Moon className="h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}
              className="cursor-pointer flex items-center text-red-700 gap-2.5 py-2 px-3 text-sm hover:!bg-red-700 focus:!bg-red-700 !text-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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