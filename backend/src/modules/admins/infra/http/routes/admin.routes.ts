import Router from "express";
import AdminController from "../controllers/adminController";

import { AuthAdmin } from "@shared/infra/http/middlewares/ensuredAuthenticated";

const adminRouter = Router();

const adminController = new AdminController();

adminRouter.post("/", adminController.post);
adminRouter.put("/edit/:id", adminController.update);

adminRouter.post("/create-user-store", adminController.createUserStore);

export default adminRouter;
