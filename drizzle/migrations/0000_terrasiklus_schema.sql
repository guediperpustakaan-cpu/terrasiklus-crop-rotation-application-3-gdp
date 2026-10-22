CREATE TABLE "crops" (
	"id" serial PRIMARY KEY NOT NULL,
	"common_name" varchar(120) NOT NULL,
	"family_id" integer NOT NULL,
	"nutrient_demand" varchar(24) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"location" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_families" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"crop_id" integer NOT NULL,
	"planted_on" date NOT NULL,
	"harvested_on" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"area" real NOT NULL,
	"soil_type" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soil_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"tested_on" date NOT NULL,
	"ph" real NOT NULL,
	"n" real NOT NULL,
	"p" real NOT NULL,
	"k" real NOT NULL,
	"organic_matter" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_family_id_plant_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."plant_families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_tests" ADD CONSTRAINT "soil_tests_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crops_common_name_unique" ON "crops" USING btree ("common_name");--> statement-breakpoint
CREATE INDEX "crops_family_id_idx" ON "crops" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "farms_owner_id_idx" ON "farms" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plant_families_name_unique" ON "plant_families" USING btree ("name");--> statement-breakpoint
CREATE INDEX "plantings_plot_planted_idx" ON "plantings" USING btree ("plot_id","planted_on");--> statement-breakpoint
CREATE INDEX "plantings_crop_id_idx" ON "plantings" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "plots_farm_id_idx" ON "plots" USING btree ("farm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "soil_tests_plot_tested_idx" ON "soil_tests" USING btree ("plot_id","tested_on");