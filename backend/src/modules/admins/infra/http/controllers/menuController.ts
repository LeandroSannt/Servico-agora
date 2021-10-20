import { Request, Response } from "express";
import { MenuServices } from "@modules/admins/services/MenuServices";

class MenuController {
  async post(request: Request, response: Response) {
    const {
      label,
      link,
      isAdmin,
      submenu: { title, isActive },
    } = request.body;

    const createMenu = new MenuServices();

    const menu = await createMenu.post({
      label,
      link,
      isAdmin,
      submenu: { title, link, isActive },
    });

    return response.json(menu);
  }
}

export default MenuController;
