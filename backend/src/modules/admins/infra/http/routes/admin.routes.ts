import Router from "express";
import AdminController from "../controllers/adminController";

import { AuthAdmin } from "@shared/infra/http/middlewares/ensuredAuthenticated";

import {
  CreateAdminValidators,
  UpdateAdminValidators,
  CreateUserValidators,
} from "../validators/AdminValidators";

const adminRouter = Router();

const adminController = new AdminController();

adminRouter.post("/", CreateAdminValidators, adminController.post);
adminRouter.put("/edit/:id", UpdateAdminValidators, adminController.update);

adminRouter.post(
  "/create-user-store",
  CreateUserValidators,
  adminController.createUserStore
);

export default adminRouter;
