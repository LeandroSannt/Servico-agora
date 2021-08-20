import {Entity, Column, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn,OneToMany,JoinColumn} from 'typeorm'

import Store from './stores'

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
  store:Store


}

export default Admin
