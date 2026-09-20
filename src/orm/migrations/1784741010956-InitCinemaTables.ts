import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCinemaTables1784741010956 implements MigrationInterface {
  name = 'InitCinemaTables1784741010956';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "username" character varying(20) NOT NULL,
                "email" character varying(40) NOT NULL,
                "password_hash" character varying(100) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "CHK_0ec09b9612f678e23d88209fc1" CHECK (
                    "email" ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'
                ),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "rooms" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "is_active" boolean NOT NULL DEFAULT true,
                "movie_id" integer,
                "host_id" integer,
                CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "movie" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "description" character varying NOT NULL,
                "video_url" character varying NOT NULL,
                "duration_seconds" integer NOT NULL,
                "poster_url" character varying NOT NULL,
                CONSTRAINT "PK_cb3bb4d61cf764dc035cbedd422" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "rooms"
            ADD CONSTRAINT "FK_e29e76e506f61c49cb08beb9aca" FOREIGN KEY ("movie_id") REFERENCES "movie"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "rooms"
            ADD CONSTRAINT "FK_4ff9a8b902b374939c6e73fc48e" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "rooms" DROP CONSTRAINT "FK_4ff9a8b902b374939c6e73fc48e"
        `);
    await queryRunner.query(`
            ALTER TABLE "rooms" DROP CONSTRAINT "FK_e29e76e506f61c49cb08beb9aca"
        `);
    await queryRunner.query(`
            DROP TABLE "movie"
        `);
    await queryRunner.query(`
            DROP TABLE "rooms"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
