import { Request, Response } from "express";
import { UserService } from "@modules/users/services/UserService";

class UpdateUserAvatarController {
  async update(request: Request, response: Response) {
    try {
      const userServices = new UserService();

      const user = await userServices.updateUserAvatar({
        user_id: request.user.id,
        avatarfilename: request.file.filename,
      });

      delete user.password;

      return response.json(user);
    } catch (err) {
      console.log(err);
    }
  }
}

export default UpdateUserAvatarController;
