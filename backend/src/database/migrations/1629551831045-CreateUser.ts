import {MigrationInterface, QueryRunner,Table} from "typeorm";

export class CreateUser1629551831045 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name:"users",
        columns:[
          {
            name:'id',
            type:'uuid',
            isPrimary:true,
            generationStrategy:'uuid',
            default:'uuid_generate_v4()'
          },
          {
            name:'name',
            type:'varchar',
            isNullable:false
          },

          {
            name:'email',
            type:'varchar',
            isNullable:false
          },

          {
            name:'password',
            type:'varchar',
            isNullable:false
          },

          {
            name:'avatar',
            type:'varchar',
            isNullable:true

          },

          {
            name:"store_id",
            type:"uuid"
          },
          {
            name:"profile_id",
            type:"uuid"
          },
          {
            name:'created_at',
            type:'timestamp',
            default:'now()'
          },
          {
            name:'updated_at',
            type:'timestamp',
            default:'now()'
          },
        ],
        foreignKeys:[
          {
            name:"FKStoreUser",
            referencedTableName:"stores",
            referencedColumnNames:["id"],
            columnNames:["store_id"],
            onDelete:"SET NULL",
            onUpdate:"CASCADE"

          },
          {
            name:"FKProfileUser",
            referencedTableName:"profiles",
            referencedColumnNames:["id"],
            columnNames:["profile_id"],
            onDelete:"SET NULL",
            onUpdate:"CASCADE"

          }
        ]
      })
    )
  }

    public async down(queryRunner: QueryRunner): Promise<void> {

      await queryRunner.dropTable("users")
    }

}
