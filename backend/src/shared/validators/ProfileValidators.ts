import { Request, Response, NextFunction } from "express";
import { getCustomRepository } from "typeorm";
import { ProfilesRepository } from "@modules/profiles/infra/typeorm/repositories/ProfilesRepository";
import AppError from "@shared/errors/AppErros";

async function ProvileValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { name, id } = request.body;

    const profilesRepository = getCustomRepository(ProfilesRepository);

    const profile = await profilesRepository.findOne(id);

    if (name === profile.name) {
      throw new AppError("Ja existe um perfil com esse nome", 401);
    }

    if (!profile) {
      throw new AppError("Perfil não encontrado", 404);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { ProvileValidators };
