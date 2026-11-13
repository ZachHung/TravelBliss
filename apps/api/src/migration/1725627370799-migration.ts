import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1725627370799 implements MigrationInterface {
  name = 'Migration1725627370799';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firstName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "age"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "fullName" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ADD "birthday" TIMESTAMP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "birthday"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "fullName"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "age" integer NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ADD "lastName" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user" ADD "firstName" character varying NOT NULL`);
  }
}
