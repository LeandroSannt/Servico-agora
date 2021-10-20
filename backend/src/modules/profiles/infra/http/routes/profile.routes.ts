import Router from "express";
import { ProfileController } from "../controllers/profileController";

const profileRouter = Router();

const profileController = new ProfileController();

profileRouter.post("/", profileController.post);
profileRouter.get("/", profileController.list);
profileRouter.put("/edit/:id", profileController.update);
profileRouter.delete("/:id", profileController.delete);

export default profileRouter;
