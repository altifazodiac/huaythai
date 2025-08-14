-- เพิ่มคอลัมน์ percent ให้กับตาราง lottery_sub_types
-- ใช้สำหรับเก็บเปอร์เซ็นต์ (เช่น ค่าคอมมิชชั่น/ส่วนลด)

ALTER TABLE public.lottery_sub_types
    ADD COLUMN IF NOT EXISTS percent NUMERIC(5,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.lottery_sub_types.percent IS 'เปอร์เซ็นต์ (0-100) ค่าเริ่มต้น 0';


