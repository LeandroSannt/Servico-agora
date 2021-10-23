import { Request, Response } from "express";
import { getCustomRepository, getRepository } from "typeorm";
import { StoresRepository } from "../typeorm/repositories/StoresRepository";
import { StoreService } from "../../services/StoreService";
import Store from "../typeorm/entities/stores";

class StoreController {
  async post(request: Request, response: Response) {
    const {
      name,
      telephone,
      cpf_cnpj,
      cep,
      city,
      address,
      complement,
      avatar_store,
      admin_id,
      isActive,
    } = request.body;

    const createStore = new StoreService();

    const store = await createStore.executePost({
      name,
      telephone,
      cpf_cnpj,
      cep,
      city,
      address,
      complement,
      avatar_store,
      admin_id: request.admin.id,
      isActive,
    });

    return response.json(store);
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;

    const showStore = await getRepository(Store).findOne(id);

    console.log(showStore);

    return response.json(showStore);
  }

  async list(request: Request, response: Response) {
    const storeServices = new StoreService();

    const stores = await storeServices.executeList();

    return response.json(stores);
  }

  async update(request: Request, response: Response) {
    const {
      name,
      telephone,
      cpf_cnpj,
      cep,
      city,
      address,
      complement,
      avatar_store,
      isActive,
    } = request.body;
    const { id } = request.params;

    const storeService = new StoreService();

    const store = await storeService.executeUpdate({
      id,
      name,
      telephone,
      cpf_cnpj,
      cep,
      city,
      address,
      complement,
      avatar_store,
      isActive,
    });

    return response.json(store);
  }

  async delete(request: Request, response: Response) {
    const { id } = request.params;

    await getRepository(Store).delete(id);

    return response.json({ message: "deletado com sucesso" });
  }
}

export { StoreController };
