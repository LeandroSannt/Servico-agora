import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { ProfilesRepository } from "@modules/profiles/infra/typeorm/repositories/ProfilesRepository";
import Admin from "@modules/admins/infra/typeorm/entities/admins";
import AppError from "@shared/errors/AppErros";

async function AdminValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { name, email, id } = request.body;

    const adminsRepository = getRepository(Admin);

    const admin = await adminsRepository.findOne(id);

    if (name === admin.email) {
      throw new AppError("Ja existe um administrador com esse email", 401);
    }

    if (!admin) {
      throw new AppError("Administrador não encontrado", 404);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { AdminValidators };
