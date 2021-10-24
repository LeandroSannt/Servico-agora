import AppError from "@shared/errors/AppErros";

import { getRepository, getCustomRepository, Equal } from "typeorm";

import Menu from "@modules/admins/infra/typeorm/entities/menus";
import Submenus from "@modules/admins/infra/typeorm/entities/submenus";

import { MenuRepository } from "@modules/admins/infra/typeorm/repositories/MenusRepository";

import { Request, Response, NextFunction } from "express";

async function CreateMenuValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const {
      label,
      isAdmin,
      link,
      profile_id,
      submenu: { title, isActive, linkSubMenu },
    } = request.body;

    const sub_menusRepository = getRepository(Submenus);

    const menusRepository = getCustomRepository(MenuRepository);

    const findlabelMenu = await menusRepository.findOne(linkSubMenu);

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

async function UpdateMenuValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const {
      id,
      label,
      isAdmin,
      link,
      profile_id,
      submenu: { title, isActive, linkSubMenu },
    } = request.body;

    const menusRepository = getCustomRepository(MenuRepository);

    const menu = await menusRepository.findOne(id);

    if (!menu) {
      throw new AppError("Menu não encontrado", 404);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { UpdateMenuValidators };
