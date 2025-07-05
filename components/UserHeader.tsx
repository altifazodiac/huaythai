"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton"; // ใช้ Skeleton loading
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [credit, setCredit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชัน logout
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

  useEffect(() => {
    const fetchUserAndCredit = async () => {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('🚨 UserHeader error:', userError.message);
      }
      
      console.log('👤 UserHeader:', user ? `${user.email}` : 'Not logged in');
      
      if (user) {
        setUser(user);
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("credit_balance")
          .eq("id", user.id)
          .single();
          
        if (profileError) {
          console.error('🚨 Profile error:', profileError.message);
        }
        
        const creditAmount = profile?.credit_balance ?? 0;
        setCredit(creditAmount);
      } else {
        setUser(null);
        setCredit(null);
      }
      
      setLoading(false);
    };
    
    fetchUserAndCredit();

    const handleCreditUpdated = () => {
      fetchUserAndCredit();
    };
    
    window.addEventListener("credit-updated", handleCreditUpdated);

    return () => {
      window.removeEventListener("credit-updated", handleCreditUpdated);
    };
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -25 }} // ลด y ลงเล็กน้อย
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }} // ปรับ duration
       
      className="w-full animated-gradient-bg shadow-md py-2 px-4 sm:px-6 flex items-center justify-between   z-40" // ลด py, px, rounded, z-index
      style={{ position: "relative" }}
    >
      <Link href="/" className="flex items-center gap-2"> {/* ลด gap */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, delay: 0.1 }} // ปรับ transition
          className="text-white text-base font-medium" // ลด text size
          style={{ fontFamily: "Kanit, sans-serif" }}
        >
          🎟️ สิงโตทองคำ 77
        </motion.div>
      </Link>
      <div className="flex items-center gap-3"> {/* ลด gap */}
        {loading ? (
          <>
            <Skeleton className="w-24 h-5 rounded-md" /> {/* ปรับ Skeleton */}
            <Skeleton className="w-28 h-5 rounded-full" /> {/* ปรับ Skeleton */}
            <Skeleton className="w-8 h-8 rounded-full" /> {/* Skeleton สำหรับปุ่ม logout */}
          </>
        ) : (
          <>
            <motion.div
              initial={{ x: 15, opacity: 0 }} // ลด x
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }} // ปรับ transition
              className="text-white text-xs sm:text-sm" // ลด text size, เพิ่ม responsive
              // style={{ fontFamily: "Century Gothic, sans-serif" }} // อาจจะเปลี่ยนเป็น Kanit หรือปล่อยให้ inherit
            >
              👤 {user?.user_metadata?.name || user?.email?.split('@')[0]} {/* แสดงเฉพาะส่วนหน้า @ ของ email */}
            </motion.div>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }} // ปรับ transition
              // ปรับ bg opacity, padding, text size, shadow และสีตัวเลขเครดิต
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