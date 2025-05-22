export type LottoOverviewResponse = {
  status: "success" | "crash"
  response: {
    id: string
    url: string
    date: string
  }[]
}

 
 

export interface LotteryResult {
  id: string;
  draw_date: string;
  created_at: string;
  updated_at: string;
}

export interface LotteryResultNumber {
  id: string;
  lottery_result_id: string;
  ticket_sub_type_id: string;
  numbers: string[];
  created_at: string;
  updated_at: string;
}

export interface TicketSubType {
  id: string;
  type_name: string;
  multiplication_factor: number;
  created_at: string;
  updated_at: string;
  type_number: number;
}

export interface LotteryResultWithNumbers extends LotteryResult {
  result_numbers: (LotteryResultNumber & {
    ticket_sub_type: TicketSubType;
  })[];
}

export interface CreateLotteryResultRequest {
  draw_date: string;
  results: {
    ticket_sub_type_id: string;
    numbers: string[];
  }[];
}

export interface UpdateLotteryResultRequest {
  draw_date?: string;
  results?: {
    ticket_sub_type_id: string;
    numbers: string[];
  }[];
}
// ปรับปรุงไฟล์ types/lottery.ts เพื่อเพิ่ม type สำหรับการบันทึกลงฐานข้อมูล

export interface LottoDetailResponse {
  status: string
  response: {
    date: string
    endpoint: string
    prizes: Prize[]
    runningNumbers: RunningNumber[]
    specialNumbers: {
      lastThreeDigits: SpecialNumber
      swappedThreeDigits: SpecialNumber
      lastTwoDigits: SpecialNumber
      lastOneDigitPrizeFirst: SpecialNumber
      lastOneDigitBackTwo: SpecialNumber
    }
  }
  dbSaved?: boolean // เพิ่มฟิลด์นี้เพื่อบอกว่าบันทึกลงฐานข้อมูลสำเร็จหรือไม่
}

export interface Prize {
  id: string
  name: string
  reward: string
  amount: number
  number: string[]
}

export interface RunningNumber {
  id: string
  name: string
  reward: string
  amount: number
  number: string[]
}

export interface SpecialNumber {
  id: string
  name: string
  numbers: string[]
}

export interface ApiErrorResponse {
  status: string
  response: string
}

// เพิ่ม interface สำหรับข้อมูลในฐานข้อมูล
export interface LotteryDraw {
  id: string
  draw_date: string
  endpoint: string
  created_at: string
  updated_at: string
}

export interface LotteryResult {
  id: string
  draw_id: string
  sub_type_id: string
  number: string
  created_at: string
  updated_at: string
  lottery_draws?: LotteryDraw
  ticket_sub_types?: TicketSubType
}

export interface TicketSubType {
  id: string
  type_name: string
  multiplication_factor: number
  type_number: number
  created_at: string
  updated_at: string
}


// ปรับปรุงไฟล์ types/lottery.ts เพื่อเพิ่ม type สำหรับการบันทึกลงฐานข้อมูล

export interface LottoDetailResponse {
  status: string
  response: {
    date: string
    endpoint: string
    prizes: Prize[]
    runningNumbers: RunningNumber[]
    specialNumbers: {
      lastThreeDigits: SpecialNumber
      swappedThreeDigits: SpecialNumber
      lastTwoDigits: SpecialNumber
      lastOneDigitPrizeFirst: SpecialNumber
      lastOneDigitBackTwo: SpecialNumber
    }
  }
  dbSaved?: boolean // เพิ่มฟิลด์นี้เพื่อบอกว่าบันทึกลงฐานข้อมูลสำเร็จหรือไม่
  dbDetails?: string
}

export interface Prize {
  id: string
  name: string
  reward: string
  amount: number
  number: string[]
}

export interface RunningNumber {
  id: string
  name: string
  reward: string
  amount: number
  number: string[]
}

export interface SpecialNumber {
  id: string
  name: string
  numbers: string[]
}

export interface ApiErrorResponse {
  status: string
  response: string
   details?: string
  dbSaved?: boolean
  dbDetails?: string
}

// เพิ่ม interface สำหรับข้อมูลในฐานข้อมูล
export interface LotteryDraw {
  id: string
  draw_date: string
  endpoint: string
  created_at: string
  updated_at: string
}

export interface LotteryResult {
  id: string
  draw_id: string
  sub_type_id: string
  number: string
  created_at: string
  updated_at: string
  lottery_draws?: LotteryDraw
  ticket_sub_types?: TicketSubType
}

export interface TicketSubType {
  id: string
  type_name: string
  multiplication_factor: number
  type_number: number
  created_at: string
  updated_at: string
}
