import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { v4 as uuid } from "uuid";

import Submenus from "./submenus";

@Entity("menus")
class Menu {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  label: string;

  @Column()
  link: string;

  @Column()
  isAdmin: boolean;

  @OneToOne(() => Submenus)
  @JoinColumn({ name: "submenu_id" })
  submenu: Submenus;
  /*
  @ManyToOne(() => Submenus)
  @JoinColumn({ name: "submenu_id" })
  submenus: Submenus; */

  @Column()
  submenu_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor() {
    if (!this.id) {
      this.id = uuid();
    }
  }
}

export default Menu;
