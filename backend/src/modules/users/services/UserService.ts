import { getCustomRepository } from "typeorm";
import { UserRepository } from "../infra/typeorm/repositories/UserRepository";
import User from "../infra/typeorm/entities/users";
import AppError from "@shared/errors/AppErros";
import { hash } from "bcryptjs";

interface Request {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  store_id?: string;
  profile_id?: string;
  password?: string;
  deleted_at?: Date;
}

class UserService {
  public async executePost({
    name,
    email,
    password,
    store_id,
    profile_id,
  }: Request): Promise<User> {
    const userRepository = getCustomRepository(UserRepository);

    const hashedPassword = await hash(password, 8);

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      store_id,
      profile_id,
    });

    await userRepository.save(user);

    return user;
  }

  public async executeUpdate({
    id,
    name,
    email,
    profile_id,
  }: Request): Promise<User> {
    const userRepository = getCustomRepository(UserRepository);

    const findUser = await userRepository.findBy(id);

    const user = userRepository.merge(findUser, {
      name,
      email,
      profile_id,
    });

    await userRepository.save(user);

    return user;
  }

  public async executeList() {
    const userRepository = getCustomRepository(UserRepository);

    const users = await userRepository.notDelete();

    return users;
  }

  public async executeDelete({ id, deleted_at }: Request): Promise<User> {
    const userRepository = getCustomRepository(UserRepository);

    const findUser = await userRepository.findBy(id);

    const user = userRepository.merge(findUser, {
      deleted_at,
    });

    await userRepository.save(user);

    return user;
  }
}

export { UserService };
