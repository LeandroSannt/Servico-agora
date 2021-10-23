import { Request, Response, NextFunction } from "express";
import { getRepository, getCustomRepository } from "typeorm";
import { ProfilesRepository } from "@modules/profiles/infra/typeorm/repositories/ProfilesRepository";
import Admin from "@modules/admins/infra/typeorm/entities/admins";
import AppError from "@shared/errors/AppErros";

import { UserRepository } from "@modules/users/infra/typeorm/repositories/UserRepository";

async function CreateAdminValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { name, email, id } = request.body;

    const adminsRepository = getRepository(Admin);

    const admin = await adminsRepository.findOne(id);

    console.log(admin.email);

    if (email === admin.email) {
      throw new AppError("Ja existe um administrador com esse email", 401);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

async function UpdateAdminValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { name, email, id, password, confirmPassword } = request.body;

    const adminsRepository = getRepository(Admin);

    const admin = await adminsRepository.findOne(id);

    if (name === admin.email) {
      throw new AppError("Ja existe um administrador com esse email", 401);
    }

    if (!admin) {
      throw new AppError("Administrador não encontrado", 404);
    }

    if (password !== confirmPassword) {
      throw new AppError("Senha e confirmação de senha não são iguais", 400);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

async function CreateUserValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id, name, store_id, profile_id } = request.body;

    const userRepository = getCustomRepository(UserRepository);

    const user = await userRepository.findOne(id);

    if (name === user.email) {
      throw new AppError("Ja existe um usuario com esse email", 401);
    }

    if (!store_id) {
      throw new AppError("Loja obrigatoria", 500);
    }

    if (!profile_id) {
      throw new AppError("Perfil obrigatorio", 500);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { CreateAdminValidators, UpdateAdminValidators, CreateUserValidators };
