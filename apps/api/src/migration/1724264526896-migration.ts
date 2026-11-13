import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1724264526896 implements MigrationInterface {
  name = 'Migration1724264526896';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refreshToken"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "refreshToken" character varying`);
  }
}
