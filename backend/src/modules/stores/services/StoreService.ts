import Store from "../infra/typeorm/entities/stores";
import { StoresRepository } from "../infra/typeorm/repositories/StoresRepository";
import AppError from "@shared/errors/AppErros";

import { getCustomRepository } from "typeorm";

interface Request {
  name: string;
  cpf_cnpj: string;
  telephone: string;
  avatar_store?: string;
  cep: string;
  city: string;
  address: string;
  complement?: string;
  admin_id?: string;
  user_id?: string;
}

class StoreService {
  public async executePost({
    name,
    cpf_cnpj,
    telephone,
    avatar_store,
    cep,
    city,
    address,
    complement,
    admin_id,
    user_id,
  }: Request): Promise<Store> {
    const storesRepository = getCustomRepository(StoresRepository);

    const findCpf_cnpj = await storesRepository.findBy(cpf_cnpj);

    if (findCpf_cnpj) {
      throw new AppError("Cpf ou cnpj ja cadastrado", 401);
    }

    const store = storesRepository.create({
      name,
      cpf_cnpj,
      telephone,
      avatar_store,
      cep,
      city,
      address,
      complement,
      admin_id,
      user_id,
    });

    await storesRepository.save(store);

    return store;
  }
}

export { StoreService };
