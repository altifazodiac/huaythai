// utils/flags.ts
import { supabase } from "@/lib/supabase/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const getFlagUrl = (filename: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/images/${filename}`;
  // Or: return supabase.storage.from('flags').getPublicUrl(filename).data.publicUrl;
};

export const countryFlagImg = (country: string) => {
  const map: Record<string, string> = {
    "LA": "Laos.jpg",
    "VN": "Vietnam.jpg",
    "MY": "Malaysia.jpg",
    "SG": "Singapore.jpg",
    "DE": "Germany.jpg",
    "GB": "England.jpg",
    "JP": "Japan.jpg",
    "KR": "Korea.jpg",
    "IN": "India.jpg",
    "TH": "Thailand.jpg",
    "STOCK": "Thai.jpg",
    "US": "USA.jpg",
    "HK": "Hongkong.jpg",
    
    "TW": "Taiwan.jpg",
    
    "RU": "Russia.jpg",
     "GLO": "GLO.jpg",
    "IT": "Italy.jpg",
    "ES": "Spain.jpg",
    "CR": "CostaRica.jpg",
    "CN": "China.jpg",
    "EG": "Egypt.jpg",
    "THS": "THS.jpg",
    "YIKI88": "Yiki88.png",
    "GSB": "GSB.jpg",
     
  };
  const filename = map[country] || "Unknown.jpg";
  return getFlagUrl(filename);
};