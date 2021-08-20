import { EntityRepository, Repository } from "typeorm";

import Store from '../models/stores'

@EntityRepository(Store)
class StoresRepository extends Repository<Store> {

  public async findBy(cpf_cnpj:string):Promise<Store> {
    const findcpf_cnpj = await this.findOne({
      where:{cpf_cnpj}
    })

    return findcpf_cnpj

  }
}

export {StoresRepository}
