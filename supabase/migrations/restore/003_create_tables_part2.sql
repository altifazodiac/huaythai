-- ส่วนที่ 3: สร้างตารางที่เหลือและ Foreign Keys
SET search_path TO public;
BEGIN;

-- สร้างตารางที่เหลือ
CREATE TABLE "public"."lottery_sub_types" (
    "lottery_sub_type_id" integer NOT NULL DEFAULT nextval('lottery_sub_types_lottery_sub_type_id_seq'::regclass),
    "lottery_type_id" integer NOT NULL,
    "description" text,
    "payout_rate" numeric NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "country_origin" varchar DEFAULT 'Thailand'::character varying,
    "sub_type_name" varchar NOT NULL DEFAULT 'ไม่ระบุ'::character varying,
    "reference_source" text,
    "notes" text,
    "is_active" boolean DEFAULT true,
    "payout_cap" numeric DEFAULT 200000,
    "percent" numeric DEFAULT 0,
    PRIMARY KEY ("lottery_sub_type_id")
);

CREATE TABLE "public"."lottery_tickets" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "purchase_date" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "draw_date" date NOT NULL,
    "total_amount" numeric NOT NULL,
    "status" ticket_status NOT NULL DEFAULT 'pending'::ticket_status,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "bill_number" varchar NOT NULL UNIQUE,
    "bill_name" text,
    "draw_time" time,
    "close_time" text,
    "deleted_at" timestamptz,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."lottery_ticket_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" uuid NOT NULL,
    "lottery_sub_type_id" integer NOT NULL,
    "lottery_sub_number_id" integer NOT NULL,
    "numbers" text[] NOT NULL,
    "amount" numeric NOT NULL CHECK (amount > 0::numeric),
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "original_amount" numeric CHECK (original_amount IS NULL OR original_amount > 0::numeric),
    "effective_prize_rate" numeric CHECK (effective_prize_rate IS NULL OR effective_prize_rate >= 0::numeric),
    "number_cap_status" jsonb,
    "number_cap_action" text CHECK (number_cap_action = ANY (ARRAY['half'::text, 'close'::text])),
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."lottery_types" (
    "lottery_type_id" integer NOT NULL DEFAULT nextval('lottery_types_lottery_type_id_seq'::regclass),
    "name" varchar NOT NULL UNIQUE,
    "description" text,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "type_name" varchar,
    PRIMARY KEY ("lottery_type_id")
);

CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "email" text NOT NULL,
    "name" text,
    "credit_balance" numeric NOT NULL DEFAULT '0'::numeric,
    "house_id" integer,
    "phone" varchar,
    "line_id" varchar,
    "branch" varchar,
    "updated_at" timestamptz DEFAULT now(),
    "percent" numeric NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."lottery_winnings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ticket_item_id" uuid NOT NULL,
    "draw_id" uuid NOT NULL,
    "winning_amount" numeric NOT NULL CHECK (winning_amount > 0::numeric),
    "status" winning_status NOT NULL DEFAULT 'pending'::winning_status,
    "paid_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."managed_numbers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "lottery_sub_type_id" integer NOT NULL,
    "number" text NOT NULL,
    "digit_count" integer NOT NULL,
    "type_number" text NOT NULL,
    "action" text NOT NULL CHECK (action = ANY (ARRAY['half'::text, 'close'::text])),
    "reason" text,
    "is_manual" boolean DEFAULT false,
    "draw_date" date NOT NULL,
    "risk_percentage" numeric,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."management_fee_cycles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "cycle_start_date" date NOT NULL,
    "cycle_end_date" date NOT NULL,
    "cycle_number" integer NOT NULL,
    "total_profit_loss" numeric NOT NULL DEFAULT 0,
    "management_fee_rate" numeric NOT NULL DEFAULT 0.05 CHECK (management_fee_rate >= 0::numeric AND management_fee_rate <= 1::numeric),
    "management_fee_amount" numeric NOT NULL DEFAULT 0,
    "total_net_amount" numeric NOT NULL DEFAULT 0,
    "remaining_balance" numeric NOT NULL DEFAULT 0,
    "is_paid" boolean NOT NULL DEFAULT false,
    "paid_at" timestamptz,
    "payment_reference" text,
    "notes" text,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "auto_created" boolean DEFAULT false,
    "created_by_scheduler" boolean DEFAULT false,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."management_fee_daily_records" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "cycle_id" uuid,
    "record_date" date NOT NULL,
    "daily_profit_loss" numeric NOT NULL DEFAULT 0,
    "daily_net_amount" numeric NOT NULL DEFAULT 0,
    "daily_management_fee" numeric NOT NULL DEFAULT 0,
    "cumulative_profit_loss" numeric NOT NULL DEFAULT 0,
    "cumulative_net_amount" numeric NOT NULL DEFAULT 0,
    "cumulative_management_fee" numeric NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

-- สร้างตารางอื่นๆ ที่เหลือ
CREATE TABLE "public"."lottery_ticket_remove_logs" (
    "id" bigint NOT NULL DEFAULT nextval('lottery_ticket_remove_logs_id_seq'::regclass),
    "user_id" uuid,
    "bill_number" text,
    "group_info" jsonb,
    "removed_at" timestamptz DEFAULT now(),
    "reason" text,
    "draw_date" date,
    "close_time" text,
    "schedule_id" integer,
    "schedule" jsonb,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."lottery_winning_bills" (
    "id" integer NOT NULL DEFAULT nextval('lottery_winning_bills_id_seq'::regclass),
    "bill_number" text NOT NULL UNIQUE,
    "bill_name" text,
    "user_id" text,
    "draw_date" date,
    "total_prize" numeric,
    "status" text DEFAULT 'pending'::text,
    "paid_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

-- สร้างตารางสำหรับ scheduled_tasks และ task_logs
CREATE TABLE "public"."scheduled_tasks" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "task_type" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'pending'::varchar,
    "scheduled_at" timestamptz NOT NULL,
    "executed_at" timestamptz,
    "next_run" timestamptz,
    "lottery_type_id" integer,
    "lottery_sub_type_id" integer,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "task_data" jsonb,
    "error_message" text,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "is_active" boolean DEFAULT true,
    "cron_expression" varchar,
    "task_name" varchar,
    "description" text,
    "priority" integer DEFAULT 0,
    "timeout_seconds" integer DEFAULT 300,
    "tags" text[],
    "metadata" jsonb,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."task_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "task_id" uuid NOT NULL,
    "status" varchar NOT NULL,
    "message" text,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "execution_time" interval,
    "error_details" jsonb,
    "retry_attempt" integer DEFAULT 0,
    "log_level" varchar DEFAULT 'info'::varchar,
    "context" jsonb,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."status_change_history" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "old_status" ticket_status,
    "new_status" ticket_status,
    "changed_at" timestamptz NOT NULL DEFAULT now(),
    "reason" text,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."user_roles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "role" varchar NOT NULL DEFAULT 'user'::varchar,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

COMMIT;
