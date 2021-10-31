import { StoreController } from "../../controllers/storeController";
import UpdateStoreAvatarController from "../../controllers/UpdateAvatarController";
import { StoreValidators } from "@modules/stores/infra/http/validators/StoreValidors";
import multer from "multer";
import uploadConfig from "@config/upload";
import Router from "express";

import {
  AuthAdmin,
  AuthUser,
} from "@shared/infra/http/middlewares/ensuredAuthenticated";
import { UnauthorizedUser } from "@modules/users/infra/http/middlewares/UnauthorizedUser";

const storesRouter = Router();

const upload = multer(uploadConfig);

const StoresController = new StoreController();
const updateStoreAvatarController = new UpdateStoreAvatarController();

storesRouter.post("/", StoreValidators, StoresController.post);
storesRouter.get("/", StoresController.list);
storesRouter.get("/:id", StoresController.show);
storesRouter.put("/edit/:id", StoreValidators, StoresController.update);
storesRouter.delete("/:id", StoresController.delete);

storesRouter.patch(
  "/avatar/:id",
  upload.single("avatar"),
  updateStoreAvatarController.update
);

export default storesRouter;
