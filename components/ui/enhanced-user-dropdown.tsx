"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  credit_balance: number | null;
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
  securityLevel = "basic"
}: EnhancedUserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUserData = users.find(u => u.id === selectedUser);

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
    const creditBalance = user.credit_balance ?? 0;
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm) ||
      creditBalance.toString().includes(searchTerm)
    );
  });

  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getBalanceColor = (balance: number | null) => {
    const safeBalance = balance ?? 0;
    if (safeBalance >= 10000) return "text-green-600 dark:text-green-500";
    if (safeBalance >= 1000) return "text-blue-600 dark:text-blue-500";
    if (safeBalance >= 100) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const formatBalance = (balance: number | null) => {
    const safeBalance = balance ?? 0;
    return safeBalance.toLocaleString();
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
            "hover:border-primary/50 hover:shadow-md",
            isOpen && "border-primary shadow-lg",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedUserData ? (
              <>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {selectedUserData.name?.charAt(0) || selectedUserData.email?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-left truncate text-foreground">
                    {selectedUserData.name || selectedUserData.email || selectedUserData.phone}
                  </div>
                  {showBalance && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      <span className={getBalanceColor(selectedUserData.credit_balance)}>
                        ฿{formatBalance(selectedUserData.credit_balance)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{placeholder}</span>
              </div>
            )}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </Button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-popover border-2 border-border rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                autoFocus
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Users list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                ไม่พบผู้ใช้ที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-150 hover:bg-accent",
                    "border-l-4 border-transparent hover:border-primary",
                    selectedUser === user.id && "bg-accent border-l-primary"
                  )}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-foreground">
                        {user.name || user.email || user.phone || "ไม่ระบุชื่อ"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email && user.phone ? `${user.email} • ${user.phone}` : user.email || user.phone || ""}
                      </div>
                      {showBalance && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <CreditCard className="h-3 w-3" />
                          <span className={cn("text-sm font-medium", getBalanceColor(user.credit_balance))}>
                            ฿{formatBalance(user.credit_balance)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}