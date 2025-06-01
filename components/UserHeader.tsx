"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton"; // ใช้ Skeleton loading

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
        // ดึงเครดิตจาก profiles
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

    // ฟัง event
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
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full bg-gradient-to-r from-blue-800 via-blue-900 to-blue-800 shadow-lg py-3 px-6 flex items-center justify-between rounded-b-xl z-50"
      style={{ position: "sticky", top: 0 }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-white text-lg font-medium"
          style={{ fontFamily: "Kanit, sans-serif" }}
        >
          🎟️ หวยเศรษฐี 789
        </motion.div>
      </div>
      <div className="flex items-center gap-4">
        {loading ? (
          <Skeleton className="w-32 h-6 rounded" />
        ) : (
          <>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-white   font-sm"
              style={{ fontFamily: "Century Gothic, sans-serif" }}
            >
              👤 {user?.user_metadata?.name || user?.email}
            </motion.div>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white/20 px-4 py-1 rounded-full text-white font-sm   shadow"
            >
              💰 เครดิต: <span className="text-yellow-200">{credit?.toLocaleString() ?? 0}</span>
            </motion.div>
          </>
        )}
      </div>
    </motion.header>
  );
}