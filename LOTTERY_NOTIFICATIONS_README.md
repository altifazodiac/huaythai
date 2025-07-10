# ระบบ Toast แจ้งเตือนหวย (Lottery Notification System)

## ภาพรวม

ระบบ Toast แจ้งเตือนหวยเป็นฟีเจอร์ที่แสดงการแจ้งเตือนแบบเรียลไทม์เมื่อมีการดึงผลหวยหรือส่งผลหวยไปยัง LINE ระบบนี้ช่วยให้ผู้ดูแลระบบสามารถติดตามสถานะการทำงานของระบบได้อย่างต่อเนื่อง

## คุณสมบัติหลัก

### 🎯 การแจ้งเตือนการดึงผลหวย (Import Notifications)
- แสดงรายชื่อหวยที่ดึงมาสำเร็จ
- แสดงจำนวนผลหวยที่ดึงได้
- แสดงเวลาที่ดึงข้อมูล
- แจ้งเตือนเมื่อเกิดข้อผิดพลาดในการดึงข้อมูล

### 📤 การแจ้งเตือนการส่งผลหวย (Send Notifications)
- แสดงรายชื่อหวยที่ส่งไปยัง LINE สำเร็จ
- แสดงจำนวนผลหวยที่ส่ง
- แสดงเวลาที่ส่งข้อมูล
- แจ้งเตือนเมื่อเกิดข้อผิดพลาดในการส่งข้อมูล

### 📊 หน้าแสดงประวัติการแจ้งเตือน
- ดูสถิติการแจ้งเตือนทั้งหมด
- กรองตามประเภทการแจ้งเตือน
- ดูรายละเอียดแต่ละการแจ้งเตือน
- ตั้งค่าช่วงเวลาที่ต้องการดู

## ไฟล์ที่เกี่ยวข้อง

### 1. Backend Scripts
- `import-lottery-results.ts` - สคริปต์ดึงผลหวย (เพิ่มฟังก์ชัน toast)
- `send-lottery-results.ts` - สคริปต์ส่งผลหวย (เพิ่มฟังก์ชัน toast)

### 2. Frontend Components
- `components/LotteryNotificationToast.tsx` - Component แสดง toast notifications
- `app/(admin)/lottery-notifications/page.tsx` - หน้าแสดงประวัติการแจ้งเตือน

### 3. Database Migration
- `supabase/migrations/20241220000000_create_lottery_notifications.sql` - สร้างตารางเก็บ notifications

### 4. Layout Integration
- `app/layout.tsx` - เพิ่ม LotteryNotificationToast component
- `components/admin-sidebar.tsx` - เพิ่มลิงก์ไปยังหน้า notifications

## โครงสร้างฐานข้อมูล

### ตาราง `lottery_import_notifications`
```sql
- id (UUID): Primary key
- notification_time (TIMESTAMP): เวลาที่เกิดการแจ้งเตือน
- lottery_names (TEXT[]): รายชื่อหวยที่ดึงมา
- total_results (INTEGER): จำนวนผลหวยที่ดึงได้
- message (TEXT): ข้อความแจ้งเตือน
- notification_type (TEXT): ประเภท ('import_success', 'import_error')
- created_at (TIMESTAMP): เวลาที่บันทึกลงฐานข้อมูล
```

### ตาราง `lottery_send_notifications`
```sql
- id (UUID): Primary key
- notification_time (TIMESTAMP): เวลาที่เกิดการแจ้งเตือน
- lottery_names (TEXT[]): รายชื่อหวยที่ส่ง
- total_results (INTEGER): จำนวนผลหวยที่ส่ง
- message (TEXT): ข้อความแจ้งเตือน
- notification_type (TEXT): ประเภท ('send_success', 'send_error')
- created_at (TIMESTAMP): เวลาที่บันทึกลงฐานข้อมูล
```

## วิธีการใช้งาน

### 1. การติดตั้ง
```bash
# รัน migration เพื่อสร้างตารางฐานข้อมูล
bun run supabase migration up

# ตรวจสอบว่าตารางถูกสร้างแล้ว
bun run supabase db status
```

### 2. การตั้งค่า Toast Notifications
Component `LotteryNotificationToast` จะทำงานอัตโนมัติเมื่อเพิ่มใน layout แล้ว:

```tsx
// app/layout.tsx
import LotteryNotificationToast from "@/components/LotteryNotificationToast";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Toaster position="top-right" />
        <LotteryNotificationToast />
        {children}
      </body>
    </html>
  );
}
```

### 3. การใช้งาน Hook
```tsx
import { useLotteryNotifications } from '@/components/LotteryNotificationToast';

function MyComponent() {
  const { notifications, isLoading, fetchRecentNotifications } = useLotteryNotifications();
  
  useEffect(() => {
    fetchRecentNotifications(60); // ดึงข้อมูล 60 นาทีที่ผ่านมา
  }, []);
  
  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.message}
        </div>
      ))}
    </div>
  );
}
```

## การทำงานของระบบ

### 1. การดึงผลหวย (Import Process)
```
1. สคริปต์ import-lottery-results.ts ทำงาน
2. ดึงข้อมูลหวยจาก API
3. บันทึกลงฐานข้อมูล
4. สร้าง notification record
5. แสดง toast บนหน้าเว็บ
```

### 2. การส่งผลหวย (Send Process)
```
1. สคริปต์ send-lottery-results.ts ทำงาน
2. ดึงข้อมูลหวยจากฐานข้อมูล
3. ส่งไปยัง LINE API
4. สร้าง notification record
5. แสดง toast บนหน้าเว็บ
```

### 3. การแสดง Toast
```
1. Component LotteryNotificationToast polling ข้อมูลทุก 30 วินาที
2. ตรวจสอบ notification ใหม่
3. แสดง toast ตามประเภท (success/error)
4. เก็บประวัติใน state
```

## การตั้งค่าเพิ่มเติม

### 1. ปรับช่วงเวลา Polling
```tsx
<LotteryNotificationToast 
  pollingInterval={30000} // 30 วินาที
  maxAgeMinutes={5} // แสดงเฉพาะ 5 นาทีที่ผ่านมา
/>
```

### 2. ปรับแต่งการแสดงผล Toast
```tsx
// ใน LotteryNotificationToast.tsx
toast.success(displayMessage, {
  duration: 5000, // แสดง 5 วินาที
  position: 'top-right',
  className: 'text-sm',
});
```

### 3. การทำความสะอาดข้อมูลเก่า
```sql
-- รันฟังก์ชันลบข้อมูลเก่า (อายุเกิน 7 วัน)
SELECT cleanup_old_notifications();

-- หรือตั้งค่า cron job
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');
```

## การแก้ไขปัญหา

### 1. Toast ไม่แสดง
- ตรวจสอบว่า LotteryNotificationToast ถูกเพิ่มใน layout แล้ว
- ตรวจสอบ console errors
- ตรวจสอบว่าตารางฐานข้อมูลถูกสร้างแล้ว

### 2. ข้อมูลไม่อัปเดต
- ตรวจสอบ RLS policies ในฐานข้อมูล
- ตรวจสอบ API keys และการเชื่อมต่อ Supabase
- ตรวจสอบ network connection

### 3. Performance Issues
- ปรับ polling interval ให้เหมาะสม
- ใช้ cleanup function เพื่อลบข้อมูลเก่า
- เพิ่ม indexes ในฐานข้อมูล

## ข้อมูลเพิ่มเติม

### Dependencies
- `sonner` - สำหรับแสดง toast notifications
- `@supabase/supabase-js` - สำหรับเชื่อมต่อฐานข้อมูล
- `lucide-react` - สำหรับ icons
- `date-fns` - สำหรับจัดการวันที่

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### การพัฒนาต่อ
- เพิ่ม push notifications
- เพิ่ม email notifications
- เพิ่ม webhook notifications
- เพิ่ม dashboard analytics

---

สร้างโดย: ระบบหวยออนไลน์ สิงโตทองคำ 77
วันที่อัปเดต: 20 ธันวาคม 2567 