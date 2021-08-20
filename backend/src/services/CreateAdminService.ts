import {getRepository} from 'typeorm'
import Admin from '../models/admins'

import {hash} from 'bcryptjs'


interface Request{
  name:string;
  email:string;
  password:string;
}

class CreateAdminService{
  public async execute({name,password}:Request):Promise<void>{
      const adminRepository = getRepository(Admin)

      const hashedPassword = await hash(password,8)

      const admin = adminRepository.create({
        name,
        email,
        password
      })

      await admin.save(admin)

      return admin

    }
  }

  export {CreateAdminService}
