"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, User, CreditCard, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  credit_balance: number;
  role?: string;
}

interface EnhancedUserDropdownProps {
  users: User[];
  selectedUser: string;
  onUserSelect: (userId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showBalance?: boolean;
  securityLevel?: "basic" | "advanced" | "banking";
}

export function EnhancedUserDropdown({
  users,
  selectedUser,
  onUserSelect,
  placeholder = "เลือกผู้ใช้",
  className,
  disabled = false,
  showBalance = true,
  securityLevel = "banking"
}: EnhancedUserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [securityCheck, setSecurityCheck] = useState(false);
  const [botDetection, setBotDetection] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUserData = users.find(u => u.id === selectedUser);

  // Security features
  useEffect(() => {
    if (securityLevel === "advanced" || securityLevel === "banking") {
      // Bot detection - check for rapid clicking
      let clickCount = 0;
      let lastClickTime = 0;
      
      const handleClick = () => {
        const now = Date.now();
        if (now - lastClickTime < 100) {
          clickCount++;
          if (clickCount > 5) {
            setBotDetection(true);
            toast.error("ตรวจพบพฤติกรรมที่น่าสงสัย กรุณาลองใหม่อีกครั้ง");
            setTimeout(() => setBotDetection(false), 30000);
          }
        } else {
          clickCount = 0;
        }
        lastClickTime = now;
      };

      const element = dropdownRef.current;
      if (element) {
        element.addEventListener('click', handleClick);
        return () => element.removeEventListener('click', handleClick);
      }
    }
  }, [securityLevel]);

  // Security check for banking level
  useEffect(() => {
    if (securityLevel === "banking" && isOpen) {
      setSecurityCheck(true);
      const timer = setTimeout(() => setSecurityCheck(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, securityLevel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm) ||
      user.credit_balance.toString().includes(searchTerm)
    );
  });

  const handleUserSelect = (userId: string) => {
    if (botDetection) {
      toast.error("กรุณารอสักครู่ก่อนดำเนินการต่อ");
      return;
    }
    
    onUserSelect(userId);
    setIsOpen(false);
    setSearchTerm("");
    toast.success("เลือกผู้ใช้สำเร็จ");
  };

  const getSecurityIcon = () => {
    if (securityLevel === "banking") {
      return <Shield className="h-4 w-4 text-green-600" />;
    }
    if (securityLevel === "advanced") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return null;
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 10000) return "text-green-600";
    if (balance >= 1000) return "text-blue-600";
    if (balance >= 100) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between items-center h-12 px-4",
            "border-2 transition-all duration-200",
            "hover:border-blue-400 hover:shadow-md",
            isOpen && "border-blue-500 shadow-lg",
            disabled && "opacity-50 cursor-not-allowed",
            botDetection && "border-red-500 bg-red-50"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || botDetection}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedUserData ? (
              <>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {selectedUserData.name?.charAt(0) || selectedUserData.email?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-left truncate">
                    {selectedUserData.name || selectedUserData.email || selectedUserData.phone}
                  </div>
                  {showBalance && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      <span className={getBalanceColor(selectedUserData.credit_balance)}>
                        ฿{selectedUserData.credit_balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <User className="h-4 w-4" />
                <span>{placeholder}</span>
              </div>
            )}
            {getSecurityIcon()}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </Button>

        {/* Security overlay for banking level */}
        {securityLevel === "banking" && securityCheck && (
          <div className="absolute inset-0 bg-blue-50 border-2 border-blue-200 rounded-md flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">ตรวจสอบความปลอดภัย...</span>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                autoFocus
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Users list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                ไม่พบผู้ใช้ที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-150 hover:bg-blue-50",
                    "border-l-4 border-transparent hover:border-blue-400",
                    selectedUser === user.id && "bg-blue-100 border-l-blue-500"
                  )}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {user.name || user.email || user.phone}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {user.email && user.name ? user.email : user.phone}
                      </div>
                      {showBalance && (
                        <div className="flex items-center gap-2 mt-1">
                          <CreditCard className="h-3 w-3 text-gray-400" />
                          <span className={cn("text-sm font-medium", getBalanceColor(user.credit_balance))}>
                            ฿{user.credit_balance.toLocaleString()}
                          </span>
                          {user.role && (
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                              {user.role === 'admin' ? 'Admin' : 'User'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedUser === user.id && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Security footer */}
          {securityLevel === "banking" && (
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Shield className="h-3 w-3" />
                <span>ระบบความปลอดภัยระดับธนาคาร</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}