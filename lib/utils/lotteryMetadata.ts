// lib/utils/lotteryMetadata.ts

// Data source of truth, based on the new website's schedule.
const lotterySchedule = [
  { "time": "00:30:00", "name": "ดาวโจนส์VIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "01:30:00", "name": "ดาวโจนส์STAR", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "03:00:00", "name": "หุ้นดาวโจนส์", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "05:45:00", "name": "ลาวประตูชัย", "type": "หวยลาว", "country": "LA" },
  { "time": "06:45:00", "name": "ลาวสันติภาพ", "type": "หวยลาว", "country": "LA" },
  { "time": "07:45:00", "name": "ลาวประชาคม", "type": "หวยลาว", "country": "LA" },
  { "time": "08:30:00", "name": "ลาวEXTRA", "type": "หวยลาว", "country": "LA" },
  { "time": "08:30:00", "name": "หวย ธกส.", "type": "หวยไทย", "country": "TH" },
  { "time": "08:45:00", "name": "ลาวใต้", "type": "หวยลาว", "country": "LA" },
  { "time": "09:05:00", "name": "หุ้นนิเคอิเช้าVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "09:20:00", "name": "นิเคอิเช้า ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "09:30:00", "name": "หุ้นนิเคอิเช้า", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "09:30:00", "name": "ฮานอยอาเซียน", "type": "หวยฮานอย", "country": "VN" },
  { "time": "10:05:00", "name": "หุ้นจีนเช้าVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "10:20:00", "name": "จีนเช้า ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "10:30:00", "name": "หุ้นจีนเช้า", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "10:30:00", "name": "หวยลาวTV", "type": "หวยลาว", "country": "LA" },
  { "time": "10:35:00", "name": "หุ้นฮั่งเส็งเช้าVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "10:50:00", "name": "ฮั่งเส็งเช้า ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "11:05:00", "name": "หุ้นฮั่งเส็งเช้า", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "11:30:00", "name": "หวยฮานอยHD", "type": "หวยฮานอย", "country": "VN" },
  { "time": "11:35:00", "name": "หุ้นไต้หวันVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "11:50:00", "name": "ไต้หวัน ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "12:30:00", "name": "เกาหลี ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "12:30:00", "name": "ฮานอยSTAR", "type": "หวยฮานอย", "country": "VN" },
  { "time": "12:30:00", "name": "หวยออมสิน", "type": "หวยไทย", "country": "TH" },
  { "time": "12:35:00", "name": "หุ้นไต้หวัน", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "12:35:00", "name": "หุ้นเกาหลีVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "12:45:00", "name": "ลาวเหนือ", "type": "หวยลาว", "country": "LA" },
  { "time": "13:00:00", "name": "หุ้นนิเคอิบ่าย", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "13:15:00", "name": "นิเคอิบ่าย ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "13:25:00", "name": "หุ้นนิเคอิบ่ายVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "13:35:00", "name": "หุ้นเกาหลี", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "13:45:00", "name": "หวยลาวHD", "type": "หวยลาว", "country": "LA" },
  { "time": "14:00:00", "name": "หุ้นจีนบ่าย", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "14:05:00", "name": "จีนบ่าย ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "14:25:00", "name": "หุ้นจีนบ่ายVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "14:30:00", "name": "หวยฮานอยTV", "type": "หวยฮานอย", "country": "VN" },
  { "time": "14:50:00", "name": "ฮั่งเส็งบ่าย ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "15:25:00", "name": "ฮั่งเส็งบ่ายVIP", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "15:30:00", "name": "ฮั่งเส็งบ่าย", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "15:40:00", "name": "หวยรัฐบาล", "type": "หวยไทย", "country": "TH" },
  { "time": "15:45:00", "name": "ลาวSTAR", "type": "หวยลาว", "country": "LA" },
  { "time": "15:55:00", "name": "สิงคโปร์ ดิจิตอล", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "16:30:00", "name": "หุ้นสิงคโปร์", "type": "หวยหุ้น", "country": "STOCK" },
  { "time": "16:30:00", "name": "ฮานอยกาชาด", "type": "หวยฮานอย", "country": "VN" },
  { "time": "16:45:00", "name": "ลาวไชโย", "type": "หวยลาว", "country": "LA" }
];

// Define the type for a single lottery's metadata
// Added 'TH' and 'MY' for completeness, although 'MY' is not in the new schedule.
type LotteryMeta = { country: 'LA' | 'VN' | 'MY' | 'STOCK' | 'OTHER' | 'TH' };

// Create the metadata object by iterating through the schedule
const combinedMetadata: Record<string, LotteryMeta> = {};

for (const lottery of lotterySchedule) {
  // Ensure the country code from JSON is a valid key for our type
  const countryCode = lottery.country as LotteryMeta['country'];
  
  // Some lottery types from JSON might not map directly, handle them
  // e.g., 'หวยไทย' maps to 'TH', 'หวยฮานอย' maps to 'VN'
  if (['LA', 'VN', 'MY', 'STOCK', 'TH'].includes(countryCode)) {
      combinedMetadata[lottery.name] = { country: countryCode };
  } else {
      // Assign any other types to 'OTHER'
      combinedMetadata[lottery.name] = { country: 'OTHER' };
  }
}

// Export the final, generated metadata object
export const LOTTERY_METADATA: Record<string, LotteryMeta> = combinedMetadata;