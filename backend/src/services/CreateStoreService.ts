import Store from '../models/stores'
import {StoresRepository} from '../repositories/StoresRepository'

import {getCustomRepository} from 'typeorm'

interface Request{
  name: string;
  cpf_cnpj: string;
  telephone: string;
  avatar_store?: string;
  cep: string;
  city: string;
  address: string;
  complement?: string;
  admin_id?:string
}

class CreateStoreService{
  public async execute({name,cpf_cnpj,telephone,avatar_store,cep,city,address,complement,admin_id}:Request):Promise<Store>{
  const storesRepository = getCustomRepository(StoresRepository)

  const findCpf_cnpj = await storesRepository.findBy(
    cpf_cnpj
  )

  if(findCpf_cnpj) {
    throw new Error("Cpf ou cnpj ja cadastrado")
  }

  const store = storesRepository.create({
    name,
    cpf_cnpj,
    telephone,
    avatar_store,
    cep,
    city,
    address,
    complement,
    admin_id
  })

  await storesRepository.save(store)

  return store

  }

}

export {CreateStoreService}
