import Router from "express";
import MenuController from "../controllers/menuController";

const menuRouter = Router();

const menuController = new MenuController();

menuRouter.post("/create-sub-menu", menuController.postSubMenu);
menuRouter.post("/create-menu", menuController.postMenu);

export default menuRouter;
