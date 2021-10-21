import { EntityRepository, Repository } from "typeorm";

import Admin from "../entities/admins";

@EntityRepository(Admin)
class AdminRepository extends Repository<Admin> {
  public async findBy(id: string): Promise<Admin> {
    const findAdmin = await this.findOne({
      where: { id },
    });

    return findAdmin;
  }
  public async findByEmail(email: string): Promise<Admin> {
    const findEmail = await this.findOne({
      where: { email },
    });

    return findEmail;
  }
}

export { AdminRepository };
