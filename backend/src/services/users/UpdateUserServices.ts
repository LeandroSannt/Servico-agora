import {getCustomRepository,getRepository} from 'typeorm'
import User from '../../models/users'

interface Request{
  id:string;
  name:string;
  email:string;
  avatar?: string;
  profile_id:string;
  password:string;

}

class UpdateUserService{
  public async execute({id,email,password,name,avatar,profile_id}:Request):Promise<void>{
    const userRepository = getRepository(User)



    const user = userRepository.findOne(id)




  }

}
