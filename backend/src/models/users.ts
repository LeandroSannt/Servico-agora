import {Entity, Column, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn,JoinColumn,ManyToOne} from 'typeorm'

import Profile from './profiles'
import Store from './stores'

@Entity('users')
class User{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  avatar: string;

  @ManyToOne(() => Store)
  @JoinColumn({name:'store_id'})
  store:Store;

  @Column()
  store_id: string;

  @ManyToOne(() => Profile)
  @JoinColumn({name:'profile_id'})
  profile:Profile;

  @Column()
  profile_id:string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

}

export default User
