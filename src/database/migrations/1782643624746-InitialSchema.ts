import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782643624746 implements MigrationInterface {
    name = 'InitialSchema1782643624746'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_invite_status_enum" AS ENUM('pending', 'accepted')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "invite_status" "public"."users_invite_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "invite_token" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "invite_expires" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invite_expires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invite_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invite_status"`);
        await queryRunner.query(`DROP TYPE "public"."users_invite_status_enum"`);
    }

}
