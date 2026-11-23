import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1795420771928 implements MigrationInterface {
  name = 'Migration1795420771928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "linked_sign_in" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "provider" character varying NOT NULL, "providerUserId" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "UQ_cc40a8a289759c155802f493c27" UNIQUE ("provider", "providerUserId"), CONSTRAINT "PK_1bad05e3536fa28f04fa9406b49" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "birthday" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "phoneNumber" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "linked_sign_in" ADD CONSTRAINT "FK_1f730d53639c8792e9a3570c204" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "linked_sign_in" DROP CONSTRAINT "FK_1f730d53639c8792e9a3570c204"`
    );
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "phoneNumber" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "birthday" SET NOT NULL`);
    await queryRunner.query(`DROP TABLE "linked_sign_in"`);
  }
}
