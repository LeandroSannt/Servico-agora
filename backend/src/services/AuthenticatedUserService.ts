import {getRepository} from 'typeorm'
import User from '../models/users'
import authconfig from '../config/auth'

import {sign} from 'jsonwebtoken'
import {compare} from 'bcryptjs'

interface Request{
  email: string
  password: string
}

interface Response {
  user:User
  token:string
}

class AuthenticationUserService{
  public async execute({email,password}:Request):Promise<Response>{
    const userRepository = getRepository(User)

    const user = await userRepository.findOne({where:{email}})

    if(!user){
      throw new Error("admin not found")
    }

    const passwordmatcher = await compare(password,user.password)

    if(!passwordmatcher){
      throw new Error('Incorrect email/password combination')
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

export default AuthenticationUserService


