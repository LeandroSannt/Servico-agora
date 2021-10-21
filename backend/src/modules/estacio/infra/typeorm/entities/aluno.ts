import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class aluno {
  @PrimaryGeneratedColumn("increment")
  id: string;

  @Column()
  nome: string;

  @Column()
  matricula: number;

  @Column()
  media: number;
}

export default aluno;
