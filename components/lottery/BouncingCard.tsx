"use client";
import React, { useState, useEffect } from "react";

export default function BouncingCard({ children, idx, bouncing }: { children: React.ReactNode, idx: number, bouncing: boolean }) {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (!bouncing) {
      setIsBouncing(false);
      return;
    }
    // Randomize initial delay for smoothness
    const initialDelay = Math.random() * 60000;
    let intervalId: NodeJS.Timeout;
    const timeoutId = setTimeout(() => {
      setIsBouncing(true);
      intervalId = setInterval(() => {
        setIsBouncing(false);
        setTimeout(() => setIsBouncing(true), 100); // restart animation
      }, 60000);
    }, initialDelay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [bouncing]);

  useEffect(() => {
    if (isBouncing) {
      const timer = setTimeout(() => setIsBouncing(false), 1000); // animation duration
      return () => clearTimeout(timer);
    }
  }, [isBouncing]);

  return (
    <div className={isBouncing ? "gentle-bounce" : ""}>
      {children}
    </div>
  );
} 