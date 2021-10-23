import Profile from "../../profiles/infra/typeorm/entities/profiles";
import AppError from "@shared/errors/AppErros";

import { getCustomRepository } from "typeorm";
import { ProfilesRepository } from "../infra/typeorm/repositories/ProfilesRepository";

interface Request {
  name: string;
  ativo: boolean;
}

interface RequestUpdate {
  id: string;
  name: string;
  ativo: boolean;
}

class ProfileService {
  public async execute({ name, ativo = true }: Request): Promise<Profile> {
    const profilesRepository = getCustomRepository(ProfilesRepository);

    const profile = profilesRepository.create({
      name,
      ativo,
    });

    await profilesRepository.save(profile);

    return profile;
  }

  public async executelist() {
    const profileRepository = getCustomRepository(ProfilesRepository);

    const profile = profileRepository.find();

    return profile;
  }

  public async executeUpdate({
    id,
    name,
    ativo,
  }: RequestUpdate): Promise<Profile> {
    const profilesRepository = getCustomRepository(ProfilesRepository);

    const findProfile = await profilesRepository.findOne(id);
    const hasProfile = await profilesRepository.findBy(name);

    profilesRepository.merge(findProfile, { name, ativo });

    profilesRepository.save(findProfile);

    return findProfile;
  }

  public async executeDelete(id: string): Promise<Profile> {
    const profilesRepository = getCustomRepository(ProfilesRepository);

    const findProfile = await profilesRepository.findOne(id);

    if (!findProfile) {
      throw new AppError("Perfil não encontrado", 404);
    }

    const profile = profilesRepository.remove(findProfile);

    profilesRepository.save(findProfile);

    return findProfile;
  }
}

export { ProfileService };
