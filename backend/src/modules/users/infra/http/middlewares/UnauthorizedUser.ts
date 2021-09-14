import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";

import User from '@modules/users/infra/typeorm/entities/users'

export async function UnauthorizedUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const {user} = request

  const adminRepositories = getRepository(User)

  const isadmin = await adminRepositories.findOne(user);

  if(!isadmin){
    return next()
  }

  return response.status(401).json({
    error: "Unauthorized",
  });

}
