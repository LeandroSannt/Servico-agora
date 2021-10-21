import { getRepository, getCustomRepository } from "typeorm";
import { UserRepository } from "@modules/users/infra/typeorm/repositories/UserRepository";
import Admin from "@modules/admins/infra/typeorm/entities/admins";
import { AdminRepository } from "@modules/admins/infra/typeorm/repositories/AdminRepository";
import User from "@modules/users/infra/typeorm/entities/users";
import AppError from "@shared/errors/AppErros";

import { hash } from "bcryptjs";
import mailer from "@config/mailer";
import crypt from "crypto";

interface Request {
  name: string;
  email: string;
  password: string;
}

interface RequestUpdate {
  id: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RequestCreateUser {
  name: string;
  email: string;
  avatar?: string;
  store_id: string;
  profile_id: string;
  password: string;
}

class AdminService {
  public async execute({ name, email, password }: Request): Promise<Admin> {
    const adminsRepository = getRepository(Admin);

    const hashedPassword = await hash(password, 8);

    const admin = adminsRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    await adminsRepository.save(admin);

    return admin;
  }

  public async executeUpdate({
    id,
    name,
    email,
    password,
    confirmPassword,
  }: RequestUpdate): Promise<Admin> {
    const adminsRepository = getCustomRepository(AdminRepository);

    const findAdmin = await adminsRepository.findBy(id);
    const findEmail = await adminsRepository.findByEmail(email);

    if (password !== confirmPassword) {
      throw new AppError("Senha e confirmação de senha não são iguais", 400);
    }

    const admin = adminsRepository.merge(findAdmin, {
      name,
      email,
      password,
    });

    await adminsRepository.save(admin);

    return admin;
  }

  public async adminCreateUser({
    name,
    email,
    password,
    avatar,
    store_id,
    profile_id,
  }: RequestCreateUser): Promise<User> {
    const userRepository = getCustomRepository(UserRepository);

    const findEmail = await userRepository.findBy(email);

    if (findEmail) {
      throw new AppError("Email ja cadatrado", 401);
    }

    const newPassword = crypt.randomBytes(8).toString("hex");
    const hashedPassword = await hash(newPassword, 8);

    await mailer.sendMail({
      to: email,
      from: "lsn_cearamor@hotmail.com",
      subject: "Seja bem vindo ao Serviço Agora",
      html: `
        <h2>Seja bem-vindo!</h2>
        <p>Aqui está sua informação de acesso, seu email e senha gerados pelo sistema e são temporários, você pode alterá-los em seu perfil.</p>
        <h5>Email:</h5>
        ${email}
        <h5>Senha:</h5>
        ${newPassword}
        `,
    });

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      avatar,
      store_id,
      profile_id,
    });

    await userRepository.save(user);

    return user;
  }
}

export { AdminService };
