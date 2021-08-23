import {getRepository} from 'typeorm'
import Admin from '../models/admins'
import authconfig from '../config/auth'
import AppError from '../errors/AppErros'

import {sign} from 'jsonwebtoken'
import {compare} from 'bcryptjs'
import User from '../models/users'

interface Request{
  email: string
  password: string
}

interface Response {
  admin:Admin
  token:string
}

interface ResponseUser{
  user:User;
  token:string;

}

class AuthenticationService{
  public async execute({email,password}:Request):Promise<Response>{
    const adminRepository = getRepository(Admin)

    const admin = await adminRepository.findOne({where:{email}})

    if(!admin){
      throw new AppError("admin not found",404)
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

  public async authUser({email,password}:Request):Promise<ResponseUser>{
     const userRepository = getRepository(User)

    const user = await userRepository.findOne({where:{email}})

    if(!user){
      throw new AppError("admin not found",404)
    }

    const passwordmatcher = await compare(password,user.password)

    if(!passwordmatcher){
      throw new AppError('Incorrect email/password combination')
    }

    const token = sign({},authconfig.jwt.secret,{
      subject:user.id,
      expiresIn:authconfig.jwt.expiresIn
    })

    return {
      user,
      token
    }
  }
}

export default AuthenticationService


