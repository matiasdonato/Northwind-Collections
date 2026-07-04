import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783180188089 implements MigrationInterface {
    name = 'InitialSchema1783180188089'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "size" character varying(20) NOT NULL, "mrr" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "issued_date" date NOT NULL, "due_date" date NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'open', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_65e3145f317bd655481d3f96c7" ON "invoices"  ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "collection_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" uuid NOT NULL, "invoice_id" uuid, "type" character varying(30) NOT NULL, "notes" text, "promised_date" date, "promise_status" character varying(20), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_844aca4239b7cf37d1b56043678" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6b6c58dfde687acdb4e2a6de9b" ON "collection_actions"  ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoice_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "paid_at" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_563a5e248518c623eebd987d43" ON "payments"  ("invoice_id") `);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_65e3145f317bd655481d3f96c74" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collection_actions" ADD CONSTRAINT "FK_6b6c58dfde687acdb4e2a6de9b9" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collection_actions" ADD CONSTRAINT "FK_5b720e099951b1f360aee92fa47" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_563a5e248518c623eebd987d43e" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_563a5e248518c623eebd987d43e"`);
        await queryRunner.query(`ALTER TABLE "collection_actions" DROP CONSTRAINT "FK_5b720e099951b1f360aee92fa47"`);
        await queryRunner.query(`ALTER TABLE "collection_actions" DROP CONSTRAINT "FK_6b6c58dfde687acdb4e2a6de9b9"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_65e3145f317bd655481d3f96c74"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_563a5e248518c623eebd987d43"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b6c58dfde687acdb4e2a6de9b"`);
        await queryRunner.query(`DROP TABLE "collection_actions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65e3145f317bd655481d3f96c7"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "customers"`);
    }

}
