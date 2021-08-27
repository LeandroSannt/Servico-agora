import {Request, Response} from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import { ProfilesRepository } from '../repositories/ProfilesRepository';
import {ProfileService} from '../services/ProfileService'
import Profile from '../models/profiles'


class ProfileController {
  async post(request: Request, response: Response){
    const {name,ativo} = request.body

    const createProfile = new ProfileService()

    const profile = await createProfile.execute({
      name,
      ativo
    })

    return response.json(profile)
  }

  async show(request: Request, response: Response){
    const {id} = request.params

    const showProfile = await getRepository(Profile).findOne(id)

    return response.json(showProfile)
  }

  async list(request: Request, response: Response){
    const profileRepository = getCustomRepository(ProfilesRepository)

    const profile = await profileRepository.find()

    return response.json(profile)
  }

  async update(request: Request, response: Response){

    const updateProfile = new ProfileService()

    //const profile = await updateProfile.executeUpdate({})

    // await getRepository(Profile).update(id,request.body)

    // const updateProfile = await getRepository(Profile).findOne(id)

    // if(!updateProfile){
    //   throw new Error("Perfil não foi encontrada")
    // }

    // return response.json(updateProfile)
  }

  async delete(request: Request, response: Response){
    const {id} = request.params

    await getRepository(Profile).delete(id)

    return response.json({message:"deletado com sucesso"})
  }
}


export {ProfileController}


