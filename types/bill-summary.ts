export interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  sub_type_name: string;
  country_origin: string;
  lottery_type_detail: string;
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  numbers_count: number;
  items_count: number;
  status: string;
}

export interface BillDetail {
  bill_number: string;
  item_id: string;
  lottery_type: string;
  numbers: string[];
  numbers_count: number;
  amount: number;
  price_paid: number;
}
