export interface TicketSubType {
  id: string
  type_name: string
  multiplication_factor: number
  created_at?: string
  updated_at?: string
}

export interface Ticket {
  id: string
  number: string
  type_id: string // References ticket_sub_types.id
  price: number
  amount?: number
  name: string
  ticketNumber: string
}

export interface TicketResult {
  id: string
  result_date: string
  ticket_sub_type_id: string
  winning_number: string | null // สะท้อนว่า winning_number สามารถเป็น null
  created_at: string
}

export interface WinningTicket {
  id: string
  ticket_purchase_id: string
  ticket_purchase_item_id: string
  ticket_result_id: string
  winning_amount: number
  is_claimed: boolean
  created_at: string
  updated_at?: string
}
