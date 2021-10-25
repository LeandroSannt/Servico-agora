import { EntityRepository, Repository, IsNull, Not } from "typeorm";

import User from "../entities/users";

@EntityRepository(User)
class UserRepository extends Repository<User> {
  public async findBy(email: string): Promise<User> {
    const findEmail = await this.findOne({
      where: { email },
    });

    return findEmail;
  }

  public async notDelete() {
    const findNotDelete = await this.find({
      deleted_at: Not(IsNull()),
    });

    return findNotDelete;
  }
}

export { UserRepository };
