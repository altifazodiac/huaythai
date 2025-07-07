"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  credit: number | null;
  loading: boolean;
  fetchCredit: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [credit, setCredit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredit = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credit_balance")
        .eq("id", user.id)
        .single();
      setCredit(profile?.credit_balance ?? 0);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchCredit();
      }
      setLoading(false);
    };
    
    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchCredit();
      } else {
        setCredit(null);
      }
    });

    window.addEventListener("credit-updated", fetchCredit);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener("credit-updated", fetchCredit);
    };
  }, [fetchCredit]);

  return (
    <AuthContext.Provider value={{ user, credit, loading, fetchCredit }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 