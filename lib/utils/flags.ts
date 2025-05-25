// utils/flags.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getFlagUrl = (filename: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/images/${filename}`;
  // Or: return supabase.storage.from('flags').getPublicUrl(filename).data.publicUrl;
};

export const countryFlagImg = (country: string) => {
  const map: Record<string, string> = {
    "ลาว": "Laos.jpg",
    "เวียดนาม": "Vietnam.jpg",
    "มาเลเซีย": "Malaysia.jpg",
    "สิงคโปร์": "Singapore.jpg",
    "เยอรมัน": "Germany.jpg",
    "อังกฤษ": "England.jpg",
    "ญี่ปุ่น": "Japan.jpg",
    "เกาหลีใต้": "Korea.jpg",
    "อินเดีย": "India.jpg",
    "ไทย": "Thai.jpg",
    "สหรัฐอเมริกา": "USA.jpg",
    "ฮ่องกง": "Hongkong.jpg",
    "เยอรมนี": "Germany.jpg",
    "ไต้หวัน": "Taiwan.jpg",
    "สหราชอาณาจักร": "England.jpg",
    "รัสเซีย": "Russia.jpg",
    "สหรัฐอินเดีย": "India.jpg",
    "อิตาลี": "Italy.jpg",
    "สเปน": "Spain.jpg",
    "คอสโทรีกา": "CostaRica.jpg",
    "จีน": "China.jpg",
    "อียิปต์": "Egypt.jpg",
  };
  const filename = map[country] || "Unknown.jpg";
  return getFlagUrl(filename);
};