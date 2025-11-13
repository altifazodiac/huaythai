-- ส่วนที่ 4: สร้าง Foreign Keys และ Constraints
SET search_path TO public;
BEGIN;

-- สร้าง Foreign Keys ทั้งหมด
ALTER TABLE "public"."animal_numbers" ADD CONSTRAINT "animal_numbers_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles" ("id");

ALTER TABLE "public"."delete_history" ADD CONSTRAINT "delete_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."lottery_tickets" ("id");
ALTER TABLE "public"."delete_history" ADD CONSTRAINT "delete_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles" ("id");

ALTER TABLE "public"."drawing_schedules" ADD CONSTRAINT "drawing_schedules_lottery_type_id_fkey" FOREIGN KEY ("lottery_type_id") REFERENCES "public"."lottery_types" ("lottery_type_id");
ALTER TABLE "public"."drawing_schedules" ADD CONSTRAINT "drawing_schedules_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."lottery_name_aliases" ADD CONSTRAINT "lottery_name_aliases_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."lottery_result_numbers" ADD CONSTRAINT "lottery_result_numbers_lottery_result_id_fkey" FOREIGN KEY ("lottery_result_id") REFERENCES "public"."lottery_results" ("id");
ALTER TABLE "public"."lottery_result_numbers" ADD CONSTRAINT "lottery_result_numbers_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."lottery_results" ADD CONSTRAINT "lottery_results_lottery_type_id_fkey" FOREIGN KEY ("lottery_type_id") REFERENCES "public"."lottery_types" ("lottery_type_id");
ALTER TABLE "public"."lottery_results" ADD CONSTRAINT "lottery_results_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");
ALTER TABLE "public"."lottery_results" ADD CONSTRAINT "lottery_results_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."drawing_schedules" ("schedule_id");

ALTER TABLE "public"."lottery_sub_number" ADD CONSTRAINT "lottery_sub_number_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."lottery_sub_types" ADD CONSTRAINT "lottery_sub_types_lottery_type_id_fkey" FOREIGN KEY ("lottery_type_id") REFERENCES "public"."lottery_types" ("lottery_type_id");

ALTER TABLE "public"."lottery_tickets" ADD CONSTRAINT "lottery_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles" ("id");

ALTER TABLE "public"."lottery_ticket_items" ADD CONSTRAINT "lottery_ticket_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."lottery_tickets" ("id");
ALTER TABLE "public"."lottery_ticket_items" ADD CONSTRAINT "lottery_ticket_items_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");
ALTER TABLE "public"."lottery_ticket_items" ADD CONSTRAINT "lottery_ticket_items_lottery_sub_number_id_fkey" FOREIGN KEY ("lottery_sub_number_id") REFERENCES "public"."lottery_sub_number" ("id");

ALTER TABLE "public"."lottery_winnings" ADD CONSTRAINT "lottery_winnings_ticket_item_id_fkey" FOREIGN KEY ("ticket_item_id") REFERENCES "public"."lottery_ticket_items" ("id");
ALTER TABLE "public"."lottery_winnings" ADD CONSTRAINT "lottery_winnings_draw_id_fkey" FOREIGN KEY ("draw_id") REFERENCES "public"."lottery_draws" ("id");

ALTER TABLE "public"."managed_numbers" ADD CONSTRAINT "managed_numbers_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."management_fee_daily_records" ADD CONSTRAINT "management_fee_daily_records_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."management_fee_cycles" ("id");

ALTER TABLE "public"."lottery_ticket_remove_logs" ADD CONSTRAINT "lottery_ticket_remove_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles" ("id");

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."house_percentages" ("id");

ALTER TABLE "public"."scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_lottery_type_id_fkey" FOREIGN KEY ("lottery_type_id") REFERENCES "public"."lottery_types" ("lottery_type_id");
ALTER TABLE "public"."scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_lottery_sub_type_id_fkey" FOREIGN KEY ("lottery_sub_type_id") REFERENCES "public"."lottery_sub_types" ("lottery_sub_type_id");

ALTER TABLE "public"."status_change_history" ADD CONSTRAINT "status_change_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."lottery_tickets" ("id");
ALTER TABLE "public"."status_change_history" ADD CONSTRAINT "status_change_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles" ("id");

ALTER TABLE "public"."task_logs" ADD CONSTRAINT "task_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."scheduled_tasks" ("id");

ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id");

-- สร้างตารางเพิ่มเติมที่พบใน dump
CREATE TABLE "public"."management_fee_scheduler_settings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "is_enabled" boolean DEFAULT true,
    "cycle_days" integer DEFAULT 7,
    "auto_create_next_cycle" boolean DEFAULT true,
    "last_cycle_created_at" timestamptz,
    "next_cycle_date" date,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."scrape_schedules" (
    "id" integer NOT NULL DEFAULT nextval('scrape_schedules_id_seq'::regclass),
    "drawing_time" time NOT NULL UNIQUE,
    "last_run" timestamp,
    "status" varchar,
    "next_run" timestamp,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."task_queue" (
    "id" bigint NOT NULL DEFAULT nextval('task_queue_id_seq'::regclass),
    "task_id" text NOT NULL,
    "task_type" text NOT NULL,
    "drawing_time" time,
    "lottery_sub_type_id" integer,
    "status" text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text])),
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "attempts" integer DEFAULT 0,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."ticket_purchases" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "ticket_set_number" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" timestamptz,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."ticket_purchase_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ticket_purchase_id" uuid,
    "ticket_sub_type_id" uuid,
    "ticket_number" text NOT NULL,
    "amount" numeric NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."ticket_sub_types" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" varchar NOT NULL,
    "description" text,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY ("id")
);

-- Foreign Keys สำหรับตารางเพิ่มเติม
ALTER TABLE "public"."ticket_purchases" ADD CONSTRAINT "ticket_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id");
ALTER TABLE "public"."ticket_purchase_items" ADD CONSTRAINT "ticket_purchase_items_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "public"."ticket_purchases" ("id");

COMMIT;
