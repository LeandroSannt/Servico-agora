import { Router } from "express";
import UserController from "../controllers/userController";
import UpdateUserAvatarController from "../controllers/updateUserAvatarController";
import uploadConfig from "@config/upload";

import multer from "multer";

const userRouter = Router();

const upload = multer(uploadConfig);

const userController = new UserController();
const updateUserAvatarController = new UpdateUserAvatarController();

userRouter.post("/", userController.post);
userRouter.get("/", userController.list);
userRouter.put("/edit/:id", userController.update);
userRouter.delete("/delete/:id", userController.delete);

userRouter.patch(
  "/avatar",
  upload.single("avatar"),
  updateUserAvatarController.update
);

export default userRouter;
