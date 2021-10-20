import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMenu1634684810160 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "menus",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "label",
            type: "varchar",
            isNullable: false,
          },

          {
            name: "link",
            type: "varchar",
            isNullable: false,
          },

          {
            name: "isAdmin",
            type: "boolean",
            isNullable: false,
            default: false,
          },

          {
            name: "submenu_id",
            type: "uuid",
            isNullable: true,
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
        foreignKeys: [
          {
            name: "FKSubMenu",
            referencedTableName: "Sub-Menus",
            referencedColumnNames: ["id"],
            columnNames: ["submenu_id"],
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("menus");
  }
}
