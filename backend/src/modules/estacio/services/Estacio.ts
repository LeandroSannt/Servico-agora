import { getRepository, getCustomRepository } from "typeorm";
import AppError from "@shared/errors/AppErros";

import { hash } from "bcryptjs";

import { database2 } from "@shared/infra/typeorm";
import Teste from "../infra/typeorm/entities/aluno";

interface Request {
  matricula: number;
  media: number;
  nome: string;
}

class EstacioService {
  public async execute({ matricula, nome, media }: Request): Promise<Teste> {
    const adminsRepository = database2.getRepository(Teste);

    const teste = adminsRepository.create({
      matricula,
      nome,
      media,
    });

    await adminsRepository.save(teste);

    return teste;
  }
}

export { EstacioService };
