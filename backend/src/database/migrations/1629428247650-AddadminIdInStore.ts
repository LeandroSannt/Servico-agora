import {MigrationInterface, QueryRunner,TableColumn,TableForeignKey} from "typeorm";

export class AddadminIdInStore1629428247650 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.addColumn('stores',new TableColumn({
        name:"admin_id",
        type:"uuid",
        isNullable:true
      }))

      await queryRunner.createForeignKey('stores',new TableForeignKey({
        name:"StoresAdmin",
        columnNames:['admin_id'],
        referencedColumnNames:['id'],
        referencedTableName:"admin",
        onDelete:'SET NULL',
        onUpdate:'CASCADE',
      }))
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropForeignKey('stores','StoresAdmin')
      await queryRunner.dropColumn('stores','admin_id')

      await queryRunner.dropColumn('stores',new TableColumn({
        name:"admin_id",
        type:'varchar'
      }))
    }
}
