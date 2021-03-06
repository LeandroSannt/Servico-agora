import Profile from '../models/profiles'
import AppError from '../errors/AppErros'

import {getCustomRepository} from 'typeorm'
import { ProfilesRepository } from '../repositories/ProfilesRepository'

interface Request{
  name: string;
  ativo:boolean;
}

interface RequestUpdate{
  id:string;
  name: string;
  ativo:boolean;
}


class ProfileService{
  public async execute({name,ativo}:Request):Promise<Profile>{
  const profilesRepository = getCustomRepository(ProfilesRepository)

  const findName = await profilesRepository.findBy(
    name
  )

  if(findName) {
    throw new AppError("Perfil ja cadastrado")
  }

  const profile = profilesRepository.create({
    name,
    ativo
  })

  await profilesRepository.save(profile)

  return profile

  }

  public async executeUpdate({id,name,ativo}:RequestUpdate):Promise<Profile>{
    const profilesRepository = getCustomRepository(ProfilesRepository)

    const findProfile = await profilesRepository.findOne(id)

    if(!findProfile){
      throw new AppError("Perfil não encontrado",404)
    }

    profilesRepository.save(findProfile)

    return findProfile

  }
}

export {ProfileService}
