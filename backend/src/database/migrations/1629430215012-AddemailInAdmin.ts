import {MigrationInterface, QueryRunner,TableColumn} from "typeorm";

export class AddemailInAdmin1629430215012 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
        "admin",
            new TableColumn({
                name: "email",
                type: "varchar",
                isNullable: false
            })
    )
}

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropColumn("admin" , "email")

    }

}
