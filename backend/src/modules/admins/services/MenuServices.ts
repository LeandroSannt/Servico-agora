import Profile from "../../profiles/infra/typeorm/entities/profiles";
import AppError from "@shared/errors/AppErros";

import { getRepository } from "typeorm";

import Menus from "../infra/typeorm/entities/menus";
import Submenus from "../infra/typeorm/entities/submenus";

interface Request {
  label: string;
  link: string;
  isAdmin: boolean;
  submenu: {
    title: string;
    link: string;
    isActive: boolean;
  };
}

interface RequestUpdate {
  id: string;
  name: string;
  ativo: boolean;
}

class MenuServices {
  public async post({
    label,
    link,
    isAdmin,
    submenu: { title, isActive },
  }: Request): Promise<Menus> {
    const menusRepository = getRepository(Menus);
    const sub_menusRepository = getRepository(Submenus);

    let subMenu = await sub_menusRepository.findOne({
      where: {
        title: label,
      },
    });

    if (!subMenu) {
      subMenu = sub_menusRepository.create({
        title,
        link,
        isActive,
      });

      await sub_menusRepository.save(subMenu);
    }

    const menu = menusRepository.create({
      label,
      link,
      isAdmin,
      submenu: { title, link, isActive },
    });

    await menusRepository.save(menu);

    return menu;
  }

  /*  public async executeUpdate({
    id,
    name,
    ativo,
  }: RequestUpdate): Promise<Profile> {
    const profilesRepository = getCustomRepository(ProfilesRepository);

    const findProfile = await profilesRepository.findOne(id);

    if (!findProfile) {
      throw new AppError("Perfil não encontrado", 404);
    }

    profilesRepository.save(findProfile);

    return findProfile;
  } */
}

export { MenuServices };
