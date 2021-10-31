import Store from "../infra/typeorm/entities/stores";
import { StoresRepository } from "../infra/typeorm/repositories/StoresRepository";
import AppError from "@shared/errors/AppErros";
import path from "path";
import fs from "fs";
import uploadConfig from "@config/upload";

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

interface FileProps {
  store_id: string;
  avatarfilename: string;
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
  public async updateStoreAvatar({
    store_id,
    avatarfilename,
  }: FileProps): Promise<Store> {
    const userRepository = getRepository(Store);

    const user = await userRepository.findOne(store_id);

    if (!user) {
      throw new AppError("nao foi encontrado usuario");
    }

    if (user.avatar_store) {
      const userAvatarFilePath = path.join(
        uploadConfig.directory,
        user.avatar_store
      );
      const userAvatarFileExists = await fs.promises.stat(userAvatarFilePath);

      if (userAvatarFileExists) {
        await fs.promises.unlink(userAvatarFilePath);
      }
    }

    user.avatar_store = avatarfilename;
    await userRepository.save(user);

    return user;
  }
}

export { StoreService };
