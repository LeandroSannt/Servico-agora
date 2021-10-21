import Router from "express";
import MenuController from "../controllers/menuController";

const menuRouter = Router();

const menuController = new MenuController();

menuRouter.get("/", menuController.list);
menuRouter.post("/create-sub-menu", menuController.postSubMenu);
menuRouter.post("/create-menu", menuController.postMenu);
menuRouter.put("/edit/:id", menuController.update);
menuRouter.delete("/:id", menuController.delete);

export default menuRouter;
