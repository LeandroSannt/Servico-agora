import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsActiveInStore1634945061003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "stores",
      new TableColumn({
        name: "isActive",
        type: "boolean",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("stores", "isActive");
  }
}
