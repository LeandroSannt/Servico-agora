import { EntityRepository, Repository } from "typeorm";

import Profile from '../entities/profiles'

@EntityRepository(Profile)
class ProfilesRepository extends Repository<Profile> {

  public async findBy(name:string):Promise<Profile> {
    const findName = await this.findOne({
      where:{name}
    })

    return findName

  }
}

export {ProfilesRepository}
