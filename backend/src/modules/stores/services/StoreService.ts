import Store from "../infra/typeorm/entities/stores";
import { StoresRepository } from "../infra/typeorm/repositories/StoresRepository";
import AppError from "@shared/errors/AppErros";

import { getCustomRepository, getRepository } from "typeorm";

interface Request {
  id?: string;
  name: string;
  cpf_cnpj: string;
  telephone: string;
  avatar_store?: string;
  cep: string;
  city: string;
  address: string;
  complement?: string;
  admin_id?: string;
  isActive: boolean;
}

class StoreService {
  public async executePost({
    id,
    name,
    cpf_cnpj,
    telephone,
    avatar_store,
    cep,
    city,
    address,
    complement,
    admin_id,
    isActive,
  }: Request): Promise<Store> {
    const storesRepository = getCustomRepository(StoresRepository);

    //const find_Store = await storesRepository.findOne(id);

    /*  if (find_Store.name !== name) {
      const find_name = await storesRepository.findByName(name);

      if (find_name) {
        throw new AppError("Ja existe uma loja com esse nome", 401);
      }
    }

    if (find_Store.cpf_cnpj !== cpf_cnpj) {
      const findCpf_cnpj = await storesRepository.findByCpf_Cnpj(cpf_cnpj);

      if (findCpf_cnpj) {
        throw new AppError("Cpf ou cnpj ja cadastrado", 401);
      }
    }

    if (!find_Store) {
      throw new AppError("Loja não encontrada", 404);
    } */

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
      isActive,
    });

    await storesRepository.save(store);

    return store;
  }
  public async executeUpdate({
    id,
    name,
    cpf_cnpj,
    telephone,
    avatar_store,
    cep,
    city,
    address,
    complement,
    isActive,
  }: Request): Promise<Store> {
    const storesRepository = getCustomRepository(StoresRepository);

    const find_Store = await storesRepository.findOne(id);

    /*if (find_Store.name !== name) {
      const find_name = await storesRepository.findByName(name);

      if (find_name) {
        throw new AppError("Ja existe uma loja com esse nome", 401);
      }
    }

    if (find_Store.cpf_cnpj !== cpf_cnpj) {
      const findCpf_cnpj = await storesRepository.findByCpf_Cnpj(cpf_cnpj);

      if (findCpf_cnpj) {
        throw new AppError("Cpf ou cnpj ja cadastrado", 401);
      }
    }

    if (!find_Store) {
      throw new AppError("Loja não encontrada", 404);
    } */

    const store = storesRepository.merge(find_Store, {
      name,
      cpf_cnpj,
      telephone,
      avatar_store,
      cep,
      city,
      address,
      complement,
      isActive,
    });

    await storesRepository.save(store);

    return store;
  }
  public async executeList() {
    const storesRepository = getCustomRepository(StoresRepository);

    const stores = await storesRepository.find();

    return stores;
  }
  public async executeShow({
    name,
    cpf_cnpj,
    telephone,
    avatar_store,
    cep,
    city,
    address,
    complement,
    admin_id,
  }: Request): Promise<Store> {
    const storesRepository = getCustomRepository(StoresRepository);

    const findCpf_cnpj = await storesRepository.findByCpf_Cnpj(cpf_cnpj);

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
    });

    await storesRepository.save(store);

    return store;
  }
}

export { StoreService };
