import { supabase } from "@/lib/supabase/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const getFlagUrl = (filename: string): string => {
  if (!filename) {
    return `${supabaseUrl}/storage/v1/object/public/images/Unknown.png`;
  }
  return `${supabaseUrl}/storage/v1/object/public/images/${filename}`;
};

export const countryFlagImg = (country: string | null | undefined): string => {
  if (!country) {
    return getFlagUrl("Unknown.png");
  }

  // Map Thai stock index names (including VIP and digital variants) to country codes
  const thaiToCodeMap: Record<string, string> = {
    // Country names
    ประเทศไทย: "TH",
    ลาว: "LA",
    เวียดนาม: "VN",
    มาเลเซีย: "MY",
    สิงคโปร์: "SG",
    เยอรมนี: "DE",
    อังกฤษ: "GB",
    ญี่ปุ่น: "JP",
    เกาหลี: "KR",
    อินเดีย: "IN",
    สหรัฐอเมริกา: "US",
    ฮ่องกง: "HK",
    ไต้หวัน: "TW",
    รัสเซีย: "RU",
    อิตาลี: "IT",
    สเปน: "ES",
    คอสตาริกา: "CR",
    จีน: "CN",
    อียิปต์: "EG",
    // Stock indices and variants
    ดาวโจนส์VIP: "US",
    ดาวโจนส์STAR: "US",
    หุ้นดาวโจนส์: "US",
    หุ้นนิเคอิเช้าVIP: "JP",
    "นิเคอิเช้า ดิจิตอล": "JP",
    หุ้นนิเคอิเช้า: "JP",
    หุ้นจีนเช้าVIP: "CN",
    "จีนเช้า ดิจิตอล": "CN",
    หุ้นจีนเช้า: "CN",
    หุ้นฮั่งเส็งเช้าVIP: "HK",
    "ฮั่งเส็งเช้า ดิจิตอล": "HK",
    หุ้นฮั่งเส็งเช้า: "HK",
    หุ้นไต้หวันVIP: "TW",
    "ไต้หวัน ดิจิตอล": "TW",
    "เกาหลี ดิจิตอล": "KR",
    หุ้นเกาหลีVIP: "KR",
    หุ้นไต้หวัน: "TW",
    หุ้นนิเคอิบ่าย: "JP",
    "นิเคอิบ่าย ดิจิตอล": "JP",
    หุ้นนิเคอิบ่ายVIP: "JP",
    หุ้นเกาหลี: "KR",
    หุ้นจีนบ่าย: "CN",
    "จีนบ่าย ดิจิตอล": "CN",
    หุ้นจีนบ่ายVIP: "CN",
    "ฮั่งเส็งบ่าย ดิจิตอล": "HK",
    ฮั่งเส็งบ่ายVIP: "HK",
    ฮั่งเส็งบ่าย: "HK",
    "สิงคโปร์ ดิจิตอล": "SG",
    หุ้นสิงคโปร์: "SG",
    หุ้นสิงคโปร์VIP: "SG",
  };

  // Map country codes to flag filenames
  const codeToFlagMap: Record<string, string> = {
    LA: "Laos.jpg",
    VN: "Vietnam.jpg",
    MY: "Malaysia.jpg",
    SG: "Singapore.jpg",
    DE: "Germany.jpg",
    GB: "England.jpg",
    JP: "Japan.jpg",
    KR: "Korea.jpg",
    IN: "India.jpg",
    TH: "Thailand.jpg",
    STOCK: "Unknown.jpg",
    US: "USA.jpg",
    HK: "Hongkong.jpg",
    TW: "Taiwan.jpg",
    RU: "Russia.jpg",
    GLO: "GLO.jpg",
    IT: "Italy.jpg",
    ES: "Spain.jpg",
    CR: "CostaRica.jpg",
    CN: "China.jpg",
    EG: "Egypt.jpg",
    THS: "THS.jpg",
    YIKI88: "Yiki88.png",
    GSB: "GSB.jpg",
    DJI: "USA.jpg",
    NIKKEI: "Japan.jpg",
    HANGSENG: "Hongkong.jpg",
    SET: "Thailand.jpg",
    SSE: "China.jpg",
    KOSPI: "KOSPI.jpg",
     
  };

  // Normalize the input: check if it's a Thai name or stock index and convert to code
  const normalizedCountry = thaiToCodeMap[country] || country.toUpperCase();
  const filename = codeToFlagMap[normalizedCountry] || "Unknown.png";
  return getFlagUrl(filename);
};