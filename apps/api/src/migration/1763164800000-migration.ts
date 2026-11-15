import { MigrationInterface, QueryRunner } from 'typeorm';

// Linked sign-in (docs/adr/0005-linked-sign-in.md): users without password, email, phone or birthday
export class Migration1763164800000 implements MigrationInterface {
  name = 'Migration1763164800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "linked_sign_in" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "provider" character varying NOT NULL, "providerUserId" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "UQ_linked_sign_in_provider_user" UNIQUE ("provider", "providerUserId"), CONSTRAINT "PK_linked_sign_in" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "linked_sign_in" ADD CONSTRAINT "FK_linked_sign_in_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    for (const column of ['password', 'email', 'phoneNumber', 'birthday']) {
      await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "${column}" DROP NOT NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Fails while users without these exist: delete or complete them first
    for (const column of ['password', 'email', 'phoneNumber', 'birthday']) {
      await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "${column}" SET NOT NULL`);
    }
    await queryRunner.query(`DROP TABLE "linked_sign_in"`);
  }
}
