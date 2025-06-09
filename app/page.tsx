// app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        router.replace("/login");
      }
    });
  }, [router]);

  // เพิ่ม useEffect สำหรับ redirect เมื่อ user login แล้ว
  useEffect(() => {
    if (!loading && user) {
      router.replace("/lottery-main");
    }
  }, [loading, user, router]);

  if (loading) return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "80vh"
    }}>
      <div className="fancy-spinner">
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="dot"></div>
      </div>
      <div style={{ marginTop: 24, fontSize: 24, fontWeight: "bold", color: "#1e90ff" }}>
        กำลังโหลด...
      </div>
      <style>{`
        .fancy-spinner {
          position: relative;
          width: 80px;
          height: 80px;
        }
        .fancy-spinner .ring {
          position: absolute;
          border: 8px solid #1e90ff;
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }
        .fancy-spinner .ring:nth-child(1) {
          width: 80px;
          height: 80px;
          border-color: #1e90ff transparent transparent transparent;
        }
        .fancy-spinner .ring:nth-child(2) {
          width: 60px;
          height: 60px;
          top: 10px;
          left: 10px;
          border-color: #ff69b4 transparent transparent transparent;
          animation-duration: 1.5s;
        }
        .fancy-spinner .dot {
          position: absolute;
          width: 16px;
          height: 16px;
          background: #ffd700;
          border-radius: 50%;
          top: 32px;
          left: 32px;
          animation: pulse 1s infinite alternate;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        @keyframes pulse {
          0% { transform: scale(1);}
          100% { transform: scale(1.3);}
        }
      `}</style>
          </div>
  );
  return null;
}