CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('parent_child', 'spouse', 'adoption');--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"family_name" varchar(120) NOT NULL,
	"given_name" varchar(120) NOT NULL,
	"kana" varchar(240),
	"gender" "gender" DEFAULT 'unknown',
	"birth_date" varchar(10),
	"death_date" varchar(10),
	"address" text,
	"phone" varchar(60),
	"email" varchar(160),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"type" "relationship_type" NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"start_date" varchar(10),
	"end_date" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_id_persons_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_id_persons_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;