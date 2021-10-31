import { Request, Response } from "express";
import { StoreService } from "@modules/stores/services/StoreService";

class UpdateStoreAvatarController {
  async update(request: Request, response: Response) {
    try {
      const storeServices = new StoreService();
      const { id } = request.params;

      const store = await storeServices.updateStoreAvatar({
        store_id: id,
        avatarfilename: request.file.filename,
      });

      return response.json(store);
    } catch (err) {
      console.log(err);
    }
  }
}

export default UpdateStoreAvatarController;
