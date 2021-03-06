import {getCustomRepository} from 'typeorm'
import {UserRepository} from '../repositories/UserRepository'
import User from '../models/users'
import AppError from '../errors/AppErros'


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
        throw new AppError('Email ja cadatrado')
      }

      const user = userRepository.create({
        name,
        email,
        password,
        avatar,
        store_id,
        profile_id
      })


      await userRepository.save(user)

      return user

    }
  }

  export {CreateUserService}
