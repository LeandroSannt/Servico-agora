import { getCustomRepository, getRepository } from "typeorm";
import { UserRepository } from "../infra/typeorm/repositories/UserRepository";
import User from "../infra/typeorm/entities/users";
import AppError from "@shared/errors/AppErros";
import { hash } from "bcryptjs";
import path from "path";
import fs from "fs";
import uploadConfig from "../../../config/upload";

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

interface PropsUser {
  user_id: string;
  avatarfilename: string;
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

  public async updateUserAvatar({
    user_id,
    avatarfilename,
  }: PropsUser): Promise<User> {
    const userRepository = getRepository(User);

    const user = await userRepository.findOne(user_id);

    if (!user) {
      throw new AppError("nao foi encontrado usuario");
    }

    if (user.avatar) {
      const userAvatarFilePath = path.join(uploadConfig.directory, user.avatar);
      const userAvatarFileExists = await fs.promises.stat(userAvatarFilePath);

      if (userAvatarFileExists) {
        await fs.promises.unlink(userAvatarFilePath);
      }
    }

    user.avatar = avatarfilename;
    await userRepository.save(user);

    return user;
  }
}

export { UserService };
