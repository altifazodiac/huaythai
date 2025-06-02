"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLoading } from "./LoadingProvider";

export default function RouteChangeHandler() {
  const pathname = usePathname();
  const { setLoading } = useLoading();

  useEffect(() => {
    // เมื่อ path เปลี่ยน ให้ปิด loading
    setLoading(false);
  }, [pathname, setLoading]);

  return null;
}