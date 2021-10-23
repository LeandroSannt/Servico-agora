import { Request, Response, NextFunction } from "express";
import { getCustomRepository, getRepository } from "typeorm";
import { StoresRepository } from "@modules/stores/infra/typeorm/repositories/StoresRepository";
import AppError from "@shared/errors/AppErros";

async function StoreValidators(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const {
      id,
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

    const storesRepository = getCustomRepository(StoresRepository);

    const find_Store = await storesRepository.findOne(id);
    console.log(find_Store);

    if (find_Store.name !== name) {
      const find_name = await storesRepository.findByName(name);

      if (find_name) {
        throw new AppError("Ja existe uma loja com esse nome", 401);
      }
    }

    return next();
  } catch (err) {
    console.log(err);
    throw new AppError("Server Error", 500);
  }
}

export { StoreValidators };
