import { Request, Response, NextFunction } from "express";
import { getRepository, getCustomRepository } from "typeorm";
import AppError from "@shared/errors/AppErros";

import { UserRepository } from "@modules/users/infra/typeorm/repositories/UserRepository";

async function CreateUserValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id, name, email, profile_id } = request.body;

    const userRepository = getCustomRepository(UserRepository);

    const user = await userRepository.findOne(id);

    if (email === user.email) {
      throw new AppError("Ja existe um usuario com esse email", 401);
    }

    if (!user) {
      throw new AppError("Não foi possivel encontrar esse usuário", 404);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

async function UpdateUserValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id, name, email, profile_id } = request.body;

    const userRepository = getCustomRepository(UserRepository);

    const user = await userRepository.findOne(id);

    if (email === user.email) {
      throw new AppError("Ja existe um usuario com esse email", 401);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { CreateUserValidators };
