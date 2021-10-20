import { Request, Response } from "express";
import { getCustomRepository, getRepository } from "typeorm";
import { ProfilesRepository } from "@modules/profiles/infra/typeorm/repositories/ProfilesRepository";
import { ProfileService } from "@modules/profiles/services/ProfileService";
import Profile from "../../typeorm/entities/profiles";

class ProfileController {
  async post(request: Request, response: Response) {
    const { name, ativo } = request.body;

    const createProfile = new ProfileService();

    const profile = await createProfile.execute({
      name,
      ativo,
    });

    return response.json(profile);
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;

    const showProfile = await getRepository(Profile).findOne(id);

    return response.json(showProfile);
  }

  async list(request: Request, response: Response) {
    const profileRepository = getCustomRepository(ProfilesRepository);

    const profile = await profileRepository.find();

    return response.json(profile);
  }

  async update(request: Request, response: Response) {
    const updateProfile = new ProfileService();

    const { id } = request.params;

    const { ativo, name } = request.body;

    const profile = await updateProfile.executeUpdate({ id, name, ativo });

    return response.json(profile);
  }

  async delete(request: Request, response: Response) {
    const profilesServices = new ProfileService();
    const { id } = request.params;

    profilesServices.executeDelete(id);

    return response.status(200);
  }
}

export { ProfileController };
