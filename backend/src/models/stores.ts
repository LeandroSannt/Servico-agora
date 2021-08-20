import {Entity, Column, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn,OneToMany,JoinColumn,ManyToOne} from 'typeorm'

import Admin from './admins'

@Entity('stores')
class Store{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  cpf_cnpj: string;



  // @OneToMany(() => Admin,(admin) => admin.id)
  // @JoinColumn({name:'admin_id'})
  // admin:Admin

  @ManyToOne(() => Admin)
  @JoinColumn({name:'admin_id'})
  admin:Admin

  @Column()
  telephone: string;

  @Column({unique:true})
  avatar_store: string;

  @Column()
  cep:string;

  @Column()
  city: string;

  @Column()
  address: string;

  @Column()
  complement: string;

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

}

export default Store
