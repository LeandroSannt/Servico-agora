import { EntityRepository, Repository } from "typeorm";

import Menu from "../entities/menus";

@EntityRepository(Menu)
class MenuRepository extends Repository<Menu> {
  public async findBy(label: string): Promise<Menu> {
    const findMenu = await this.findOne({
      where: { label },
    });

    return findMenu;
  }
}

export { MenuRepository };
