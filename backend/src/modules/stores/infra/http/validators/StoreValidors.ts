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
    const { id, name, cpf_cnpj } = request.body;

    const storesRepository = getCustomRepository(StoresRepository);

    const store = await storesRepository.findOne(id);

    if (name === store.name) {
      throw new AppError("Ja existe uma loja com esse nome", 401);
    }

    if (cpf_cnpj === store.cpf_cnpj) {
      throw new AppError("Cpf ou cnpj ja cadastrado", 401);
    }

    if (!store) {
      throw new AppError("Loja não encontrada", 404);
    }

    return next();
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
}

export { StoreValidators };
