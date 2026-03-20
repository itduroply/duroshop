


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text",
    "module" "text",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branch_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid",
    "item_id" "uuid",
    "quantity" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."branch_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."distribution_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "distribution_id" "uuid",
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    CONSTRAINT "distribution_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."distribution_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."distributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid",
    "receiver_id" "uuid",
    "receiver_type_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "manager_approved_by" "uuid",
    "hr_approved_by" "uuid",
    "issued_by" "uuid",
    "issued_at" timestamp with time zone,
    "proof_image_url" "text",
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."distributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "unit" "text",
    "description" "text",
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "total_qty" integer DEFAULT 0 NOT NULL,
    "hr_approval" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "message" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiver_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."receiver_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "receiver_type_id" "uuid",
    "branch_id" "uuid",
    "address" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."receivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_request_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stock_request_id" "uuid",
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    CONSTRAINT "stock_request_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."stock_request_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid",
    "requested_by" "uuid",
    "status" "text" DEFAULT 'pending_rm_approval'::"text" NOT NULL,
    "manager_approved_by" "uuid",
    "dispatched_by" "uuid",
    "reason" "text",
    "expected_date" "date",
    "notes" "text",
    "assigned_to" "uuid",
    "category_id" "uuid",
    "hr_approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid",
    "item_id" "uuid",
    "quantity_change" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "role_id" "uuid",
    "branch_id" "uuid",
    "reporting_manager" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branch_stock" 
    ADD CONSTRAINT "branch_stock_branch_id_item_id_key" UNIQUE ("branch_id", "item_id");



ALTER TABLE ONLY "public"."branch_stock"
    ADD CONSTRAINT "branch_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distribution_items"
    ADD CONSTRAINT "distribution_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiver_types"
    ADD CONSTRAINT "receiver_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."receiver_types"
    ADD CONSTRAINT "receiver_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receivers"
    ADD CONSTRAINT "receivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_request_items"
    ADD CONSTRAINT "stock_request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_branch_stock_branch" ON "public"."branch_stock" USING "btree" ("branch_id");



CREATE INDEX "idx_distributions_branch" ON "public"."distributions" USING "btree" ("branch_id");



CREATE INDEX "idx_receivers_branch" ON "public"."receivers" USING "btree" ("branch_id");



CREATE INDEX "idx_stock_requests_branch" ON "public"."stock_requests" USING "btree" ("branch_id");



CREATE INDEX "idx_stock_tx_branch" ON "public"."stock_transactions" USING "btree" ("branch_id");



CREATE INDEX "idx_users_branch" ON "public"."users" USING "btree" ("branch_id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."branch_stock"
    ADD CONSTRAINT "branch_stock_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_stock"
    ADD CONSTRAINT "branch_stock_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."distribution_items"
    ADD CONSTRAINT "distribution_items_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."distribution_items"
    ADD CONSTRAINT "distribution_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_hr_approved_by_fkey" FOREIGN KEY ("hr_approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_manager_approved_by_fkey" FOREIGN KEY ("manager_approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."receivers"("id");



ALTER TABLE ONLY "public"."distributions"
    ADD CONSTRAINT "distributions_receiver_type_id_fkey" FOREIGN KEY ("receiver_type_id") REFERENCES "public"."receiver_types"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."receivers"
    ADD CONSTRAINT "receivers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."receivers"
    ADD CONSTRAINT "receivers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."receivers"
    ADD CONSTRAINT "receivers_receiver_type_id_fkey" FOREIGN KEY ("receiver_type_id") REFERENCES "public"."receiver_types"("id");



ALTER TABLE ONLY "public"."stock_request_items"
    ADD CONSTRAINT "stock_request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."stock_request_items"
    ADD CONSTRAINT "stock_request_items_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "public"."stock_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_dispatched_by_fkey" FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_manager_approved_by_fkey" FOREIGN KEY ("manager_approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_reporting_manager_fkey" FOREIGN KEY ("reporting_manager") REFERENCES "public"."users"("id");



CREATE POLICY "Allow authenticated users to create activity logs" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to create items" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete items" ON "public"."items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update items" ON "public"."items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view activity logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view items" ON "public"."items" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."branch_stock" TO "anon";
GRANT ALL ON TABLE "public"."branch_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."branch_stock" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."distribution_items" TO "anon";
GRANT ALL ON TABLE "public"."distribution_items" TO "authenticated";
GRANT ALL ON TABLE "public"."distribution_items" TO "service_role";



GRANT ALL ON TABLE "public"."distributions" TO "anon";
GRANT ALL ON TABLE "public"."distributions" TO "authenticated";
GRANT ALL ON TABLE "public"."distributions" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."receiver_types" TO "anon";
GRANT ALL ON TABLE "public"."receiver_types" TO "authenticated";
GRANT ALL ON TABLE "public"."receiver_types" TO "service_role";



GRANT ALL ON TABLE "public"."receivers" TO "anon";
GRANT ALL ON TABLE "public"."receivers" TO "authenticated";
GRANT ALL ON TABLE "public"."receivers" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."stock_request_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_request_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_requests" TO "anon";
GRANT ALL ON TABLE "public"."stock_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_requests" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transactions" TO "anon";
GRANT ALL ON TABLE "public"."stock_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







