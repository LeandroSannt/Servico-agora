import { Request, Response } from "express";
import { MenuServices } from "@modules/admins/services/MenuServices";

class MenuController {
  async postSubMenu(request: Request, response: Response) {
    const {
      label,
      link,
      isAdmin,
      submenu: { title, isActive, linkSubMenu },
    } = request.body;

    const createMenu = new MenuServices();

    const menu = await createMenu.postSubMenu({
      label,
      link,
      isAdmin,
      submenu: { title, isActive, linkSubMenu },
    });

    return response.json(menu);
  }

  async postMenu(request: Request, response: Response) {
    const { label, link, isAdmin, submenu_id } = request.body;

    const createMenu = new MenuServices();

    const menu = await createMenu.postMenu({
      label,
      link,
      isAdmin,
      submenu_id,
    });

    return response.json(menu);
  }

  async list(request: Request, response: Response) {
    const listServices = new MenuServices();

    const list = listServices.listMenu();

    console.log(list);

    return response.json(list);
  }
}

export default MenuController;
