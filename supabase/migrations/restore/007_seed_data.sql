-- ส่วนที่ 7: สร้าง Seed Data พื้นฐาน
SET search_path TO public;
BEGIN;

-- สร้าง house_percentages
INSERT INTO "public"."house_percentages" ("id", "house_name", "percent1", "percent2") VALUES
    (1, 'House A', 85, 15),
    (2, 'House B', 80, 20);

-- สร้าง lottery_types
INSERT INTO "public"."lottery_types" ("lottery_type_id", "name", "type_name", "description", "created_at", "updated_at") VALUES
    (1, 'ยี่กี', 'ยี่กี', 'หวยยี่กี ออกทุก 15 นาที', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (2, 'หวยรัฐบาล', 'หวยรัฐบาล', 'หวยรัฐบาลไทย', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (3, 'หวยฮานอย', 'หวยฮานอย', 'หวยฮานอย พิเศษ', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (4, 'หวยลาว', 'หวยลาว', 'หวยลาวสตาร์', timezone('utc'::text, now()), timezone('utc'::text, now()));

-- สร้าง lottery_sub_types
INSERT INTO "public"."lottery_sub_types" ("lottery_sub_type_id", "lottery_type_id", "sub_type_name", "description", "payout_rate", "country_origin", "created_at", "updated_at") VALUES
    (1, 1, '3 ตัวบน', 'ยี่กี 3 ตัวบน', 800, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (2, 1, '3 ตัวโต๊ด', 'ยี่กี 3 ตัวโต๊ด', 120, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (3, 1, '2 ตัวบน', 'ยี่กี 2 ตัวบน', 90, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (4, 1, '2 ตัวล่าง', 'ยี่กี 2 ตัวล่าง', 90, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (5, 1, 'วิ่งบน', 'ยี่กี วิ่งบน', 3.2, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (6, 1, 'วิ่งล่าง', 'ยี่กี วิ่งล่าง', 4.2, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (7, 2, '3 ตัวบน', 'หวยรัฐบาล 3 ตัวบน', 800, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (8, 2, '3 ตัวโต๊ด', 'หวยรัฐบาล 3 ตัวโต๊ด', 120, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (9, 2, '2 ตัวบน', 'หวยรัฐบาล 2 ตัวบน', 90, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (10, 2, '2 ตัวล่าง', 'หวยรัฐบาล 2 ตัวล่าง', 90, 'Thailand', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (11, 3, '4 ตัวบน', 'หวยฮานอย 4 ตัวบน', 4000, 'Vietnam', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (12, 3, '3 ตัวบน', 'หวยฮานอย 3 ตัวบน', 800, 'Vietnam', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (13, 3, '2 ตัวบน', 'หวยฮานอย 2 ตัวบน', 90, 'Vietnam', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (14, 4, '4 ตัวบน', 'หวยลาว 4 ตัวบน', 4000, 'Laos', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (15, 4, '3 ตัวบน', 'หวยลาว 3 ตัวบน', 800, 'Laos', timezone('utc'::text, now()), timezone('utc'::text, now())),
    (16, 4, '2 ตัวบน', 'หวยลาว 2 ตัวบน', 90, 'Laos', timezone('utc'::text, now()), timezone('utc'::text, now()));

-- สร้าง lottery_sub_number
INSERT INTO "public"."lottery_sub_number" ("id", "lottery_sub_type_id", "name", "description", "digit_number", "type_number", "price_paid", "created_at", "updated_at") VALUES
    (1, 1, '3 ตัวบน', '3 ตัวบน', 3, 'บน', 800, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (2, 2, '3 ตัวโต๊ด', '3 ตัวโต๊ด', 3, 'โต๊ด', 120, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (3, 3, '2 ตัวบน', '2 ตัวบน', 2, 'บน', 90, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (4, 4, '2 ตัวล่าง', '2 ตัวล่าง', 2, 'ล่าง', 90, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (5, 5, 'วิ่งบน', 'วิ่งบน', 1, 'วิ่งบน', 3.2, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (6, 6, 'วิ่งล่าง', 'วิ่งล่าง', 1, 'วิ่งล่าง', 4.2, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (7, 7, '3 ตัวบน', '3 ตัวบน', 3, 'บน', 800, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (8, 8, '3 ตัวโต๊ด', '3 ตัวโต๊ด', 3, 'โต๊ด', 120, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (9, 9, '2 ตัวบน', '2 ตัวบน', 2, 'บน', 90, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (10, 10, '2 ตัวล่าง', '2 ตัวล่าง', 2, 'ล่าง', 90, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (11, 11, '4 ตัวบน', '4 ตัวบน', 4, 'บน', 4000, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (12, 12, '3 ตัวบน', '3 ตัวบน', 3, 'บน', 800, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (13, 13, '2 ตัวบน', '2 ตัวบน', 2, 'บน', 90, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (14, 14, '4 ตัวบน', '4 ตัวบน', 4, 'บน', 4000, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (15, 15, '3 ตัวบน', '3 ตัวบน', 3, 'บน', 800, timezone('utc'::text, now()), timezone('utc'::text, now())),
    (16, 16, '2 ตัวบน', '2 ตัวบน', 2, 'บน', 90, timezone('utc'::text, now()), timezone('utc'::text, now()));

-- drawing_schedules ถูกสร้างไปแล้วในไฟล์ 004_create_foreign_keys.sql

COMMIT;
