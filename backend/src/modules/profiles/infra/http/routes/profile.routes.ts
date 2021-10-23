import Router from "express";
import { ProfileController } from "../controllers/profileController";
import { ProvileValidators } from "../validators/ProfileValidators";

const profileRouter = Router();

const profileController = new ProfileController();

profileRouter.post("/", ProvileValidators, profileController.post);
profileRouter.get("/", profileController.list);
profileRouter.put("/edit/:id", ProvileValidators, profileController.update);
profileRouter.delete("/:id", profileController.delete);

export default profileRouter;
