-- Create a function to get matching tickets
CREATE OR REPLACE FUNCTION get_matching_tickets(p_ticket_set_number text)
RETURNS TABLE (
  tod_number text,
  teng_number text,
  amount_display text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- เลขโต๊ด (3 ตัว)
  tod_numbers AS (
    SELECT 
      tpi.ticket_number,
      tpi.amount AS tod_amount,
      tp.ticket_set_number,
      tp.user_id
    FROM ticket_purchase_items tpi
    JOIN ticket_purchases tp ON tpi.ticket_purchase_id = tp.id
    JOIN ticket_sub_types tst ON tpi.ticket_sub_type_id = tst.id
    WHERE tst.id = '4e9ab25a-57f4-4c80-af65-b3eef322a908' -- ID ประเภทโต๊ด
      AND LENGTH(tpi.ticket_number) = 3 -- ตรวจสอบว่าเป็นเลข 3 ตัว
      AND tp.deleted_at IS NULL
  ),

  -- เลขเต็ง (3 ตัว)
  teng_numbers AS (
    SELECT 
      tpi.ticket_number,
      tpi.amount AS teng_amount,
      tp.ticket_set_number,
      tp.user_id
    FROM ticket_purchase_items tpi
    JOIN ticket_purchases tp ON tpi.ticket_purchase_id = tp.id
    JOIN ticket_sub_types tst ON tpi.ticket_sub_type_id = tst.id
    WHERE tst.id = '0638ce4b-cedb-41ff-ad18-b2c12a8b3a0c' -- ID ประเภทเต็ง
      AND LENGTH(tpi.ticket_number) = 3 -- ตรวจสอบว่าเป็นเลข 3 ตัว
      AND tp.deleted_at IS NULL
  )

  -- ค้นหาเลขที่ตรงกันทุกตัว (ไม่สนใจลำดับ)
  SELECT 
    t.ticket_number AS tod_number,
    e.ticket_number AS teng_number,
    CONCAT(t.tod_amount, ' x ', e.teng_amount) AS amount_display
  FROM tod_numbers t
  JOIN teng_numbers e ON 
    t.ticket_set_number = e.ticket_set_number AND
    t.user_id = e.user_id AND
    -- ตรวจสอบว่าเลขทั้งสามตัวตรงกัน (ไม่สนใจลำดับ)
    (
      -- กรณี 123 ตรงกับ 123
      t.ticket_number = e.ticket_number
      OR
      -- กรณี 123 ตรงกับ 132, 213, 231, 312, 321 ฯลฯ
      (
        -- ตรวจสอบว่ามีตัวเลขเหมือนกันทุกตัว
        t.ticket_number LIKE CONCAT('%', SUBSTRING(e.ticket_number, 1, 1), '%') AND
        t.ticket_number LIKE CONCAT('%', SUBSTRING(e.ticket_number, 2, 1), '%') AND
        t.ticket_number LIKE CONCAT('%', SUBSTRING(e.ticket_number, 3, 1), '%')
      )
    )
  WHERE t.ticket_set_number = p_ticket_set_number
  ORDER BY t.ticket_number;
END;
$$; 