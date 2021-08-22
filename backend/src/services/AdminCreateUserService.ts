import {getCustomRepository} from 'typeorm'
import {UserRepository} from '../repositories/UserRepository'
import User from '../models/users'

import mailer from '../config/mailer'

import crypt from 'crypto'

import {hash} from 'bcryptjs'

interface Request{
  name:string;
  email:string;
  avatar?: string;
  store_id:string;
  profile_id:string;
  password:string;

}

class CreateUserService{
  public async execute({name,email,password,avatar,store_id,profile_id}:Request):Promise<User>{
      const userRepository = getCustomRepository(UserRepository)

      const findEmail = await userRepository.findBy(email)

      if(findEmail){
        throw new Error('Email ja cadatrado')
      }

      const newPassword = crypt.randomBytes(8).toString("hex");
      const hashedPassword = await hash(newPassword,8)

      await mailer.sendMail({
        to: email,
        from:"lsn_cearamor@hotmail.com",
        subject: "Seja bem vindo ao Serviço Agora",
        html: `
        <h2>Seja bem-vindo!</h2>
        <p>Aqui está sua informação de acesso, seu email e senha gerados pelo sistema e são temporários, você pode alterá-los em seu perfil.</p>
        <h5>Email:</h5>
        ${email}
        <h5>Senha:</h5>
        ${newPassword}
        `,
        });

      const user = userRepository.create({
        name,
        email,
        password:hashedPassword,
        avatar,
        store_id,
        profile_id
      })


      await userRepository.save(user)

      return user

    }
  }

  export {CreateUserService}
