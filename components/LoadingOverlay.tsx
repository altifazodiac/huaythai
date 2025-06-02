"use client";
import { useLoading } from "./LoadingProvider";

export default function LoadingOverlay() {
  const { loading } = useLoading();
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="flex space-x-2">
        <span className="block w-4 h-4 bg-primary rounded-full pulse-dot"></span>
        <span className="block w-4 h-4 bg-primary rounded-full pulse-dot"></span>
        <span className="block w-4 h-4 bg-primary rounded-full pulse-dot"></span>
      </div>
    </div>
  );
}