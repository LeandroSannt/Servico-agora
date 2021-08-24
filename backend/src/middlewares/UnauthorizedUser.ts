import { Request, Response, NextFunction } from "express";
import { getCustomRepository, getRepository } from "typeorm";

import Admin from '../models/admins'
import User from '../models/users'

export async function UnauthorizedUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const {user} = request

  const adminRepositories = getRepository(User)

  const isadmin = await adminRepositories.findOne(user);
  console.log(isadmin)

  if(!isadmin){
    return next()
  }

  return response.status(401).json({
    error: "Unauthorized",
  });

}
