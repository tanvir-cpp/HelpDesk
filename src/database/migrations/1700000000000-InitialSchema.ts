import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Create Enums if they do not exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
          CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'STAFF', 'CLIENT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority_enum') THEN
          CREATE TYPE "public"."ticket_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
          CREATE TYPE "public"."ticket_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
        END IF;
      END
      $$;
    `);

    // 3. Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "email" character varying(180) NOT NULL,
        "password" character varying(255) NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'CLIENT',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    // 4. Create tickets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reference_number" character varying(50) NOT NULL,
        "subject" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "priority" "public"."ticket_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "status" "public"."ticket_status_enum" NOT NULL DEFAULT 'OPEN',
        "created_by_id" uuid NOT NULL,
        "resolved_by_id" uuid,
        "resolution_note" text,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tickets_reference_number" UNIQUE ("reference_number"),
        CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tickets_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_tickets_resolved_by" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 5. Create ticket_comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ticket_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_comments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_comments_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ticket_comments_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);

    // 6. Create ticket_activities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ticket_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "actor_id" uuid NOT NULL,
        "action" character varying(100) NOT NULL,
        "old_value" text,
        "new_value" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_activities_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_activities_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ticket_activities_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);

    // 7. Create indexes for performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_status" ON "tickets" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_priority" ON "tickets" ("priority");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_created_by" ON "tickets" ("created_by_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ticket_comments_ticket" ON "ticket_comments" ("ticket_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ticket_comments_author" ON "ticket_comments" ("author_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ticket_activities_ticket" ON "ticket_activities" ("ticket_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ticket_activities_actor" ON "ticket_activities" ("actor_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_activities";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_comments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ticket_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ticket_priority_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum";`);
  }
}
