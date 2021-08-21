import {Entity, Column, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn} from 'typeorm'

@Entity('profiles')
class Profile{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  ativo:boolean = true

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

}

export default Profile
