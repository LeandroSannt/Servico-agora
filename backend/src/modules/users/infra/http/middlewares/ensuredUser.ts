import { Request, Response, NextFunction } from "express";
import { getCustomRepository, getRepository } from "typeorm";

import User from "../../typeorm/entities/users";

export async function ensureUser(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { user } = request;

  const userRepositories = getRepository(User);

  const isuser = await userRepositories.findOne(user);

  if (isuser) {
    return next();
  }

  return response.status(401).json({
    error: "Unauthorized",
  });
}
