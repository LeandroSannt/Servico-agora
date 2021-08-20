import Store from '../models/stores'
import {StoresRepository} from '../repositories/StoresRepository'

import { getCustomRepository, getRepository } from 'typeorm';

interface Request{
  id: string;
}



class UpdateStoreService{
  public async execute({id}:Request):Promise<void>{

   // await getRepository(Store).update(id,request.body)

    const updatedStore = await getRepository(Store).findOne(id)


  }

}

export {UpdateStoreService}
