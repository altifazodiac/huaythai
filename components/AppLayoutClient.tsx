"use client";
import { usePathname } from "next/navigation";
import UserHeader from "@/components/UserHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import RouteChangeHandler from "@/components/RouteChangeHandler";

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = ["/login", "/signup"].includes(pathname);

  return (
    <>
      {!hideHeader && <UserHeader />}
      <LoadingOverlay />
      <RouteChangeHandler />
      {children}
    </>
  );
}