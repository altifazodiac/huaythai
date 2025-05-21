"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TicketSubType } from "@/types/types";

// 1. สร้าง Context
const TicketSubTypeContext = createContext<TicketSubType[] | undefined>(undefined);

// 2. Provider
export const TicketSubTypeProvider = ({ children }: { children: React.ReactNode }) => {
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("ticket_sub_types")
        .select("*")
        .order("type_number", { ascending: true })
        .order("type_name", { ascending: true });
      if (!error && data) {
        setTicketSubTypes(
          data.map((item) => ({
            id: String(item.id),
            type_name: String(item.type_name),
            multiplication_factor: Number(item.multiplication_factor),
            type_number: Number(item.type_number),
            created_at: item.created_at ? String(item.created_at) : undefined,
            updated_at: item.updated_at ? String(item.updated_at) : undefined,
          }))
        );
      }
    };
    fetch();
  }, [supabase]);

  return (
    <TicketSubTypeContext.Provider value={ticketSubTypes}>
      {children}
    </TicketSubTypeContext.Provider>
  );
};

// 3. Custom Hook
export const useTicketSubTypes = () => {
  const ctx = useContext(TicketSubTypeContext);
  if (ctx === undefined) throw new Error("useTicketSubTypes must be used within TicketSubTypeProvider");
  return ctx;
};