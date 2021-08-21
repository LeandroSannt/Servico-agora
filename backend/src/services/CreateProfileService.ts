import Profile from '../models/profiles'

import {getCustomRepository} from 'typeorm'
import { ProfilesRepository } from '../repositories/ProfilesRepository'

interface Request{
  name: string;
  ativo:boolean;
}

class CreateProfileService{
  public async execute({name,ativo}:Request):Promise<Profile>{
  const profilesRepository = getCustomRepository(ProfilesRepository)

  const findName = await profilesRepository.findBy(
    name
  )

  if(findName) {
    throw new Error("Perfil ja cadastrado")
  }

  const profile = profilesRepository.create({
    name,
    ativo
  })

  await profilesRepository.save(profile)

  return profile

  }

}

export {CreateProfileService}
