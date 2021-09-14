import {MigrationInterface, QueryRunner,Table} from "typeorm";

export class CreateStore1629324938751 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
        new Table({
          name:"stores",
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
              name:'cpf_cnpj',
              type:'varchar',
              isNullable:false

            },
            {
              name:'telephone',
              type:'varchar',
              isNullable:false
            },
            {
              name:'avatar_store',
              type:'varchar',
              isNullable:true

            },{
              name:'cep',
              type:'varchar',
              isNullable:false
            },
            {
              name:'city',
              type:'varchar',
              isNullable:false

            },
            {
              name:'address',
              type:'varchar',
              isNullable:false
            },
            {
              name:'complement',
              type:'varchar',
              isNullable:true
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
          ]
        })
      )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropTable('stores')
    }

}
