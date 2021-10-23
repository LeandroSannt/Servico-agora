import { EntityRepository, Repository } from "typeorm";

import Store from "@modules/stores/infra/typeorm/entities/stores";

import AppError from "@shared/errors/AppErros";

@EntityRepository(Store)
class StoresRepository extends Repository<Store> {
  public async findByCpf_Cnpj(cpf_cnpj: string): Promise<Store> {
    const findcpf_cnpj = await this.findOne({
      where: { cpf_cnpj },
    });
    return findcpf_cnpj;
  }

  public async findByName(name: string): Promise<Store> {
    const find_name = await this.findOne({
      where: { name },
    });

    return find_name;
  }
}

export { StoresRepository };
