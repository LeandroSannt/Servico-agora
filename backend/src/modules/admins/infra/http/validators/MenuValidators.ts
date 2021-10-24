import { Request, Response, NextFunction } from "express";
import { getRepository, getCustomRepository } from "typeorm";
import Menus from "@modules/admins/infra/typeorm/entities/menus";
import AppError from "@shared/errors/AppErros";

import { MenuRepository } from "@modules/admins/infra/typeorm/repositories/MenusRepository";

async function MenuValidators(
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

export { MenuRepository };
