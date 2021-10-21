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

    const list = await listServices.listMenu();

    return response.json(list);
  }

  async update(request: Request, response: Response) {
    const menuServices = new MenuServices();

    const { id } = request.params;

    const {
      label,
      link,
      isAdmin,
      submenu: { title, linkSubMenu, isActive },
    } = request.body;

    const menu = await menuServices.executeUpdate({
      id,
      label,
      link,
      isAdmin,
      submenu: { title, linkSubMenu, isActive },
    });

    return response.json(menu);
  }

  async delete(request: Request, response: Response) {
    const menuServices = new MenuServices();
    const { id } = request.params;

    await menuServices.executeDelete(id);

    return response.status(200).json();
  }
}

export default MenuController;
