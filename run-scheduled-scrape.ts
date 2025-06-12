import schedule from './schedule.json';
import { scrapeAndStoreLottery } from './scraper'; // ฟังก์ชันที่จะสร้างในขั้นตอนถัดไป

async function main() {
  const now = new Date(); // ควรแปลงเป็นเวลาไทย
  const currentTime = now.toTimeString().slice(0, 8); // "HH:mm:ss"

  console.log(`Dispatcher running at ${currentTime}`);

  const tasksToRun = [];

  for (const lottery of schedule) {
    const drawTime = lottery.draw_time; // "17:30:00"
    
    // เผื่อเวลาให้เว็บอัพเดท 2 นาที
    const scrapeStartTime = addMinutes(drawTime, 2); // -> "17:32:00"
    const scrapeEndTime = addMinutes(scrapeStartTime, 5); // -> "17:37:00"

    // เช็คว่าเวลาปัจจุบันอยู่ในช่วงที่ควรรันหรือไม่
    if (currentTime >= scrapeStartTime && currentTime < scrapeEndTime) {
      console.log(`Time to scrape: ${lottery.lottery_name}`);
      // เพิ่มงานเข้าไปในลิสต์ ไม่ใช่รันทันที
      tasksToRun.push(scrapeAndStoreLottery(lottery.lottery_name));
    }
  }

  if (tasksToRun.length > 0) {
    console.log(`Found ${tasksToRun.length} tasks to run. Executing...`);
    // รันทุกงานที่เจอพร้อมกัน
    await Promise.all(tasksToRun);
    console.log("All scraping tasks for this cycle are complete.");
  } else {
    console.log("No lottery to scrape at this time.");
  }
}

main();

/**
 * ฟังก์ชันสำหรับเพิ่มนาทีให้กับเวลาในรูปแบบ "HH:mm:ss"
 * @param time - เวลาเริ่มต้นในรูปแบบ string "HH:mm:ss"
 * @param mins - จำนวนนาทีที่ต้องการเพิ่ม
 * @returns - เวลาใหม่ในรูปแบบ string "HH:mm:ss"
 */
function addMinutes(time: string, mins: number): string {
    // แยกส่วนประกอบของเวลา (ชั่วโมง, นาที, วินาที) แล้วแปลงเป็นตัวเลข
    const [hours, minutes, seconds] = time.split(':').map(Number);
  
    // สร้าง Object Date ด้วยเวลาที่ระบุ
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
  
    // เพิ่มนาทีเข้าไป (Date object จะจัดการเรื่องการทดเวลาข้ามชั่วโมงหรือข้ามวันให้เอง)
    date.setMinutes(date.getMinutes() + mins);
  
    // ดึงค่า ชั่วโมง, นาที, วินาที ใหม่แล้วแปลงให้เป็น string 2 หลัก (เช่น 7 -> "07")
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMinutes = date.getMinutes().toString().padStart(2, '0');
    const newSeconds = date.getSeconds().toString().padStart(2, '0');
  
    // ประกอบร่างกลับเป็นรูปแบบ "HH:mm:ss" แล้วส่งค่าคืน
    return `${newHours}:${newMinutes}:${newSeconds}`;
  }