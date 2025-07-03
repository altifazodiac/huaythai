"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton"; // ใช้ Skeleton loading
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserHeader() {
  const [user, setUser] = useState<any>(null);
  const [credit, setCredit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndCredit = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("credit_balance")
          .eq("id", user.id)
          .single();
        setCredit(profile?.credit_balance ?? 0);
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
          </>
        )}
      </div>
    </motion.header>
  );
}