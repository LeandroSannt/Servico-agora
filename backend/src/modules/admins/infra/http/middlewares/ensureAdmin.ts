import { Request, Response, NextFunction } from "express";
import { getCustomRepository, getRepository } from "typeorm";

import Admin from '../../typeorm/entities/admins'

export async function ensureAdmin(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const {admin} = request

  const adminRepositories = getRepository(Admin)

  const isadmin = await adminRepositories.findOne(admin);

  if(isadmin){
    return next()
  }

  return response.status(401).json({
    error: "Unauthorized",
  });

}
