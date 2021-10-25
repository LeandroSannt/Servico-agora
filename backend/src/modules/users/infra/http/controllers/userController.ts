import { Request, Response } from "express";
import { UserService } from "@modules/users/services/UserService";

class UserController {
  async post(request: Request, response: Response) {
    const { name, email, password, store_id, profile_id } = request.body;

    const userServices = new UserService();

    const user = await userServices.executePost({
      name,
      email,
      password,
      store_id: request.user.store_id,
      profile_id,
    });

    return response.json(user);
  }

  async update(request: Request, response: Response) {
    const userServices = new UserService();

    const { name, email, profile_id } = request.body;
    const { id } = request.params;

    const user = await userServices.executeUpdate({
      id,
      name,
      email,
      profile_id,
    });

    return response.json(user);
  }

  async delete(request: Request, response: Response) {
    const userServices = new UserService();

    const { deleted_at } = request.body;
    const { id } = request.params;

    await userServices.executeDelete({
      id,
      deleted_at,
    });

    return response.status(200).json();
  }

  async list(request: Request, response: Response) {
    const userServices = new UserService();

    const users = await userServices.executeList();

    return response.json(users);
  }
}

export default UserController;
