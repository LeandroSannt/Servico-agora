import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class AddUserIdToStore1634860080173 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "stores",
      new TableColumn({
        name: "user_id",
        type: "uuid",
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      "stores",
      new TableForeignKey({
        name: "StoresUsers",
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("stores", "StoresUsers");
    await queryRunner.dropColumn("stores", "user_id");

    /* await queryRunner.dropColumn(
      "stores",
      new TableColumn({
        name: "user_id",
        type: "varchar",
      })
    );*/
  }
}
