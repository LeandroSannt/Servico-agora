import {getRepository} from 'typeorm'
import Admin from '../models/admins'

import {hash} from 'bcryptjs'


interface Request{
  name:string;
  email:string;
  password:string;
}

class CreateAdminService{
  public async execute({name,email,password}:Request):Promise<Admin>{
      const adminsRepository = getRepository(Admin)

      const hashedPassword = await hash(password,8)

      const admin = adminsRepository.create({
        name,
        email,
        password:hashedPassword
      })

      await adminsRepository.save(admin)

      return admin

    }
  }

  export {CreateAdminService}
