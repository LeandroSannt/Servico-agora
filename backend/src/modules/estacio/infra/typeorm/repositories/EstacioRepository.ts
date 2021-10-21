import { EntityRepository, Repository } from "typeorm";

import Aluno from "../entities/aluno";

@EntityRepository(Aluno)
class EstacioRepository extends Repository<Aluno> {}

export { EstacioRepository };
