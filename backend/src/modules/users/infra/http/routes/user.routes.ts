import { Router } from "express";
import UserController from "../controllers/userController";

const userRouter = Router();

const userController = new UserController();

userRouter.get("/", userController.list);

export default userRouter;
