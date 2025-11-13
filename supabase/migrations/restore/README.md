# Supabase Database Restore Guide

## คำแนะนำในการ Restore Database จาก Dump File

### ไฟล์ที่ต้องรันใน Supabase SQL Editor (ตามลำดับ)

1. **001_schema_types.sql**
   - สร้าง ENUM types และ Sequences
   - รันก่อนเสมอเพื่อให้โครงสร้างพร้อม

2. **002_create_tables_part1.sql**
   - สร้างตารางกลุ่มแรก (animal_numbers, credit_transactions, drawing_schedules, เป็นต้น)
   - รันหลังจากสร้าง types แล้ว

3. **003_create_tables_part2.sql**
   - สร้างตารางกลุ่มที่สอง (lottery_sub_types, lottery_tickets, profiles, เป็นต้น)
   - รันต่อจาก part1

4. **004_create_foreign_keys.sql**
   - สร้าง Foreign Key constraints และตารางเพิ่มเติม
   - รันหลังจากสร้างตารางทั้งหมดแล้ว

5. **005_create_rls_policies.sql**
   - สร้าง Row Level Security policies
   - รันหลังจากสร้าง foreign keys แล้ว

6. **006_create_functions_triggers.sql**
   - สร้าง Functions และ Triggers พื้นฐาน
   - รันหลังจากสร้าง policies แล้ว

7. **007_seed_data.sql**
   - สร้างข้อมูลพื้นฐาน (lottery types, sub types, schedules)
   - รันสุดท้ายหลังจากโครงสร้างพร้อมทั้งหมด

### ขั้นตอนการรัน

1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. เลือกไฟล์ **001_schema_types.sql** แล้วคลิก Run
4. รอจนเสร็จ แล้วทำซ้ำกับไฟล์ถัดไปตามลำดับ
5. ตรวจสอบว่าไม่มี error ในแต่ละขั้นตอน

### หมายเหตุ

- ต้องรันไฟล์ตามลำดับ เพราะมีการอ้างอิงกัน
- ถ้าเกิด error ให้ตรวจสอบว่ารันไฟล์ก่อนหน้าเรียบร้อยแล้ว
- ข้อมูลจริงจาก dump file จะต้องถูกแยกและรันในขั้นตอนถัดไป
- ไฟล์เหล่านี้มีเพียงโครงสร้างและข้อมูลพื้นฐานเท่านั้น

### การตรวจสอบหลัง Restore

หลังจากรันไฟล์ทั้งหมดเสร็จแล้ว ให้ตรวจสอบ:

1. ตารางทั้งหมดถูกสร้าง
2. Foreign keys ถูกตั้งค่า
3. RLS policies ทำงาน
4. Functions และ Triggers พร้อมใช้งาน
5. Seed data ถูกป้อนเรียบร้อย

### ถ้าต้องการ restore ข้อมูลจริง

ข้อมูลจริงจาก dump file (INSERT statements) จำเป็นต้องถูกแยกและรันในไฟล์แยกต่างหาก:
- ข้อมูล profiles
- ข้อมูล credit_transactions  
- ข้อมูล lottery_tickets
- ข้อมูลอื่นๆ ตามลำดับความสำคัญ

**คำเตือน**: การ restore ข้อมูลจริงต้องระมัดระวังเรื่อง foreign key constraints และข้อมูลซ้ำ
