import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from "typeorm";

import Admin from "../../../../admins/infra/typeorm/entities/admins";
import User from "../../../../users/infra/typeorm/entities/users";

@Entity("stores")
class Store {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  cpf_cnpj: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: "admin_id" })
  admin: Admin;

  @Column()
  admin_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  user_id: string;

  @Column()
  telephone: string;

  @Column({ unique: true })
  avatar_store: string;

  @Column()
  cep: string;

  @Column()
  city: string;

  @Column()
  address: string;

  @Column()
  complement: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Store;
