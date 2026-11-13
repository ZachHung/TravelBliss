import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700895744559 implements MigrationInterface {
  name = 'Migration1700895744559';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TYPE "public"."user_role_enum" AS ENUM(\'USER\', \'ADMIN\')');
    await queryRunner.query(
      'CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "age" integer NOT NULL, "password" character varying NOT NULL, "email" character varying NOT NULL, "username" character varying NOT NULL, "refreshToken" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT \'USER\', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user"');
    await queryRunner.query('DROP TYPE "public"."user_role_enum"');
  }
}
