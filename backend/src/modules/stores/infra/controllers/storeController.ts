import {Request, Response} from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import { StoresRepository } from '../typeorm/repositories/StoresRepository';
import {StoreService} from '../../services/StoreService'
import Store from '../typeorm/entities/stores'


class StoreController {
  async post(request: Request, response: Response){
    const {name,telephone,cpf_cnpj,cep,city,address,complement,avatar_store,admin_id} = request.body

    const createStore = new StoreService()

    const store = await createStore.execute({
      name,
      telephone,
      cpf_cnpj,
      cep,
      city,
      address,
      complement,
      avatar_store,
      admin_id:  request.admin.id
    })

    return response.json(store)
  }

  async show(request: Request, response: Response){
    const {id} = request.params

    const showStore = await getRepository(Store).findOne(id)

    console.log(showStore)

    return response.json(showStore)
  }

  async list(request: Request, response: Response){
    const storesRepository = getCustomRepository(StoresRepository)

    const stores = await storesRepository.find()

    return response.json(stores)
  }

  async update(request: Request, response: Response){
    const {name,telephone,cpf_cnpj,cep,city,address,complement,avatar_store} = request.body
    const {id} = request.params

    await getRepository(Store).update(id,request.body)

    const updatedStore = await getRepository(Store).findOne(id)

    if(!updatedStore){
      throw new Error("loja não foi encontrada")
    }

    return response.json(updatedStore)
  }

  async delete(request: Request, response: Response){
    const {id} = request.params

    await getRepository(Store).delete(id)

    return response.json({message:"deletado com sucesso"})
  }
}


export {StoreController}


