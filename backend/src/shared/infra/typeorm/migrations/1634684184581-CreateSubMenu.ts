import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSubMenu1634684184581 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "Sub-Menus",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "title",
            type: "varchar",
            isNullable: false,
          },

          {
            name: "link",
            type: "varchar",
            isNullable: false,
          },

          {
            name: "isActive",
            type: "boolean",
            isNullable: false,
            default: false,
          },

          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("Sub-Menus");
  }
}
