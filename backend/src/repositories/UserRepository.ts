import { EntityRepository, Repository } from "typeorm";

import User from '../models/users'

@EntityRepository(User)
class UserRepository extends Repository<User> {

  public async findBy(email:string):Promise<User> {
    const findEmail = await this.findOne({
      where:{email}
    })

    return findEmail

  }
}

export {UserRepository}
