import { Router } from "express";
import UserController from "../controllers/userController";

const userRouter = Router();

const userController = new UserController();

userRouter.post("/", userController.post);
userRouter.get("/", userController.list);
userRouter.put("/edit/:id", userController.update);
userRouter.delete("/delete/:id", userController.delete);

export default userRouter;
