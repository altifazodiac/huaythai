"use client";

import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CreditBalanceDisplayProps {
  balance: number;
  previousBalance?: number;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "premium" | "warning" | "danger";
  className?: string;
  animated?: boolean;
}

export function CreditBalanceDisplay({
  balance,
  previousBalance,
  showDetails = true,
  size = "md",
  variant = "default",
  className,
  animated = true
}: CreditBalanceDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);

  // Update display balance immediately when balance changes
  useEffect(() => {
    if (!animated) {
      setDisplayBalance(balance);
      return;
    }

    if (balance !== displayBalance) {
      setIsAnimating(true);
      const startBalance = displayBalance;
      const endBalance = balance;
      const duration = 800; // Reduced duration for better responsiveness
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentBalance = startBalance + (endBalance - startBalance) * easeOutQuart;
        
        setDisplayBalance(Math.round(currentBalance));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayBalance(endBalance); // Ensure final value is exact
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [balance, animated, displayBalance]);

  const getVariantStyles = () => {
    switch (variant) {
      case "premium":
        return {
          container: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
          icon: "text-purple-200",
          balance: "text-white",
          change: "text-purple-200"
        };
      case "warning":
        return {
          container: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
          icon: "text-yellow-200",
          balance: "text-white",
          change: "text-yellow-200"
        };
      case "danger":
        return {
          container: "bg-gradient-to-r from-red-500 to-pink-500 text-white",
          icon: "text-red-200",
          balance: "text-white",
          change: "text-red-200"
        };
      default:
        return {
          container: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
          icon: "text-blue-200",
          balance: "text-white",
          change: "text-blue-200"
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "p-3 rounded-lg",
          icon: "h-4 w-4",
          balance: "text-lg font-semibold",
          change: "text-xs",
          label: "text-xs"
        };
      case "lg":
        return {
          container: "p-6 rounded-xl",
          icon: "h-8 w-8",
          balance: "text-3xl font-bold",
          change: "text-sm",
          label: "text-sm"
        };
      default:
        return {
          container: "p-4 rounded-lg",
          icon: "h-5 w-5",
          balance: "text-xl font-semibold",
          change: "text-xs",
          label: "text-xs"
        };
    }
  };

  const styles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const balanceChange = previousBalance ? balance - previousBalance : 0;
  const changePercentage = previousBalance ? (balanceChange / previousBalance) * 100 : 0;

  const getBalanceStatus = () => {
    if (balance >= 10000) return { status: "excellent", color: "text-green-400", icon: TrendingUp };
    if (balance >= 5000) return { status: "good", color: "text-blue-400", icon: TrendingUp };
    if (balance >= 1000) return { status: "fair", color: "text-yellow-400", icon: TrendingUp };
    if (balance >= 100) return { status: "low", color: "text-orange-400", icon: TrendingDown };
    return { status: "critical", color: "text-red-400", icon: TrendingDown };
  };

  const balanceStatus = getBalanceStatus();
  const StatusIcon = balanceStatus.icon;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className={cn(
        styles.container,
        sizeStyles.container,
        "relative transition-all duration-300 hover:scale-105",
        isAnimating && "animate-pulse"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className={cn(styles.icon, sizeStyles.icon)} />
              <span className={cn(sizeStyles.label, "font-medium")}>เครดิตคงเหลือ</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={() => setIsVisible(!isVisible)}
            >
              {isVisible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <DollarSign className={cn(styles.icon, sizeStyles.icon)} />
            <span className={cn(styles.balance, sizeStyles.balance)}>
              {isVisible ? (
                <span className={cn(isAnimating && "animate-pulse")}>
                  {displayBalance.toLocaleString()}
                </span>
              ) : (
                <span className="tracking-wider">••••••</span>
              )}
            </span>
            <StatusIcon className={cn(balanceStatus.color, sizeStyles.icon)} />
          </div>

          {showDetails && (
            <div className="space-y-1">
              {previousBalance !== undefined && (
                <div className="flex items-center justify-between">
                  <span className={cn(styles.change, sizeStyles.change)}>
                    {balanceChange >= 0 ? "+" : ""}฿{balanceChange.toLocaleString()}
                  </span>
                  <span className={cn(styles.change, sizeStyles.change)}>
                    {changePercentage >= 0 ? "+" : ""}{changePercentage.toFixed(1)}%
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-white border-white/30",
                    balanceStatus.status === "excellent" && "bg-green-500/20",
                    balanceStatus.status === "good" && "bg-blue-500/20",
                    balanceStatus.status === "fair" && "bg-yellow-500/20",
                    balanceStatus.status === "low" && "bg-orange-500/20",
                    balanceStatus.status === "critical" && "bg-red-500/20"
                  )}
                >
                  {balanceStatus.status === "excellent" && "ยอดเยี่ยม"}
                  {balanceStatus.status === "good" && "ดี"}
                  {balanceStatus.status === "fair" && "ปานกลาง"}
                  {balanceStatus.status === "low" && "ต่ำ"}
                  {balanceStatus.status === "critical" && "วิกฤต"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Animated border */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-lg border-2 border-white/30 animate-ping"></div>
        )}
      </div>
    </div>
  );
}