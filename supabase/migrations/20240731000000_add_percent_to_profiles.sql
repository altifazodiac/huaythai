-- เพิ่มคอลัมน์ percent สำหรับค่าคอมมิชชั่นให้กับตาราง profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS percent NUMERIC(5,2) DEFAULT 0 NOT NULL;
COMMENT ON COLUMN public.profiles.percent IS 'เปอร์เซ็นต์ค่าคอมมิชชั่นของ user'; 