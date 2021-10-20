import Profile from "../../profiles/infra/typeorm/entities/profiles";
import AppError from "@shared/errors/AppErros";

import { getRepository, getCustomRepository, Equal } from "typeorm";

import Menus from "../infra/typeorm/entities/menus";
import Submenus from "../infra/typeorm/entities/submenus";

import { MenuRepository } from "../infra/typeorm/repositories/MenusRepository";

interface Request {
  label: string;
  link: string;
  isAdmin: boolean;
  submenu_id?: string;
  submenu?: {
    title?: string;
    linkSubMenu?: string;
    isActive?: boolean;
  };
}

class MenuServices {
  public async postSubMenu({
    label,
    link,
    isAdmin,
    submenu: { title, linkSubMenu, isActive },
  }: Request): Promise<Menus> {
    const menusRepository = getCustomRepository(MenuRepository);
    const sub_menusRepository = getRepository(Submenus);

    const findMenu = await menusRepository.findBy(label);

    if (findMenu) {
      throw new AppError("Menu ja cadastrado", 500);
    }

    let subMenu = sub_menusRepository.create({
      title,
      linkSubMenu,
      isActive,
    });

    await sub_menusRepository.save(subMenu);

    const menu = menusRepository.create({
      label,
      link,
      isAdmin,
      submenu: subMenu,
    });

    await menusRepository.save(menu);

    return menu;
  }

  public async postMenu({
    label,
    link,
    isAdmin,
    submenu_id,
  }: Request): Promise<Menus> {
    const menusRepository = getCustomRepository(MenuRepository);
    const sub_menusRepository = getRepository(Submenus);

    const findMenu = await menusRepository.findBy(label);

    if (findMenu) {
      throw new AppError("Menu ja cadastrado", 500);
    }

    const menu = menusRepository.create({
      label,
      link,
      isAdmin,
      submenu_id,
    });

    await menusRepository.save(menu);

    return menu;
  }

  public async listMenu() {
    const menusRepository = getCustomRepository(MenuRepository);

    const listMenu = await menusRepository.find();

    return listMenu;
  }
}

export { MenuServices };
