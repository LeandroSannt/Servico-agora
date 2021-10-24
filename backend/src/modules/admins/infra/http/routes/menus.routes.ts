import Router from "express";
import MenuController from "../controllers/menuController";
import { UpdateMenuValidators } from "../validators/MenuValidators";

const menuRouter = Router();

const menuController = new MenuController();

menuRouter.get("/", menuController.list);
menuRouter.post("/create-sub-menu", menuController.postSubMenu);
menuRouter.post("/create-menu", menuController.postMenu);
menuRouter.put("/edit/:id", UpdateMenuValidators, menuController.update);
menuRouter.delete("/:id", menuController.delete);

export default menuRouter;
