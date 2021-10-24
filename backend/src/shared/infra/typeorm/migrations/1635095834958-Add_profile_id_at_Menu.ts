import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class AddProfileIdAtMenu1635095834958 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "menus",
      new TableColumn({
        name: "profile_id",
        type: "uuid",
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      "menus",
      new TableForeignKey({
        name: "ProfileMenu",
        columnNames: ["profile_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "menus",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("menus", "ProfileMenu");
    await queryRunner.dropColumn("menus", "profile_id");
  }
}
