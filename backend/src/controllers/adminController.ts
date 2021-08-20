import {Request, Response} from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import { CreateAdminService } from '../services/CreateAdminService';

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

}


export default AdminController
