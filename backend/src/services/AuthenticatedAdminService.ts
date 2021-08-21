import {getRepository} from 'typeorm'
import Admin from '../models/admins'
import authconfig from '../config/auth'

import {sign} from 'jsonwebtoken'
import {compare} from 'bcryptjs'

interface Request{
  email: string
  password: string
}

interface Response {
  admin:Admin
  token:string
}

class AuthenticationAdminService{
  public async execute({email,password}:Request):Promise<Response>{
    const adminRepository = getRepository(Admin)

    const admin = await adminRepository.findOne({where:{email}})

    if(!admin){
      throw new Error("admin not found")
    }

    const passwordmatcher = await compare(password,admin.password)

    if(!passwordmatcher){
      throw new Error('Incorrect email/password combination')
    }

    const token = sign({},authconfig.jwt.secret,{
      subject:admin.id,
      expiresIn:authconfig.jwt.expiresIn
    })

    return {
      admin,
      token
    }

  }

}

export default AuthenticationAdminService


