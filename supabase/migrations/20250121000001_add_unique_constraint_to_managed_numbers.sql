-- เพิ่ม unique constraint เพื่อป้องกันข้อมูลซ้ำใน managed_numbers
ALTER TABLE public.managed_numbers
ADD CONSTRAINT managed_numbers_unique UNIQUE (
  lottery_sub_type_id,
  number,
  digit_count,
  type_number,
  draw_date
); 