import Teste from "../infra/typeorm/entities/aluno";
import { getRepository } from "typeorm";
import { Request, Response } from "express";

import { database2 } from "@shared/infra/typeorm";

import { EstacioService } from "../services/Estacio";

export default class ProfileController {
  async post(request: Request, response: Response) {
    const { matricula, nome, media } = request.body;
    const estacioService = new EstacioService();

    const estacio = await estacioService.execute({
      matricula,
      nome,
      media,
    });

    return response.json(estacio);
  }
}
