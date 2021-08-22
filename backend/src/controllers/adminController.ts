import {Request, Response} from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import { CreateAdminService } from '../services/CreateAdminService';
import { CreateUserService } from '../services/AdminCreateUserService';


class AdminController{
  async post(request: Request, response: Response){
    const {name,email,password} = request.body

    const createAdmin = new CreateAdminService()

    const admin = await createAdmin.execute({
      name,
      email,
      password
    })

    return response.json(admin)
  }

  async createUserStore(request: Request, response: Response){
    const {name,email,password,avatar,store_id,profile_id} = request.body

    const createUser = new CreateUserService()

    const user = await createUser.execute({
      name,
      email,
      password,
      avatar,
      store_id,
      profile_id
    })

    delete user.password

    return response.json({user,success:`A senha foi enviada para o email: ${email}`})

  }

}


export default AdminController
