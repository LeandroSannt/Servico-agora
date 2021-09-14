import {Entity, Column, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn,OneToMany,JoinColumn} from 'typeorm'

import Store from '../../../../stores/infra/typeorm/entities/stores'

@Entity('admin')
class Admin{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column()
  email: string;

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @OneToMany(() => Store,(store) => store.id)
  @JoinColumn({name:'admin_id'})
  admni:Store

  @Column()
  permissions: string;

}

export default Admin
