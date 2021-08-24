import {MigrationInterface, QueryRunner,TableColumn} from "typeorm";

export class Addpermission1629767012130 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('admin', new TableColumn({
      name: 'permissions',
      type: 'boolean',
      isNullable: true
    }))
  }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropColumn('admin','permissions')

    }

}
