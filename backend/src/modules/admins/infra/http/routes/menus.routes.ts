import Router from "express";
import MenuController from "../controllers/menuController";

const menuRouter = Router();

const menuController = new MenuController();

menuRouter.post("/", menuController.post);

export default menuRouter;
