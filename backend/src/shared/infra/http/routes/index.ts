import { Router } from "express";
import storesRouter from "@modules/stores/infra/http/routes/stores.routes";
import usersRouter from "@modules/users/infra/http/routes/user.routes";
import adminRouter from "@modules/admins/infra/http/routes/admin.routes";
import profileRouter from "@modules/profiles/infra/http/routes/profile.routes";
import menuRouter from "@modules/admins/infra/http/routes/menus.routes";
import sessionRouter from "@shared/infra/http/routes/session.routes";

//middlewares
import { AuthUser, AuthAdmin } from "../middlewares/ensuredAuthenticated";
import { UnauthorizedUser } from "@modules/users/infra/http/middlewares/UnauthorizedUser";

const routes = Router();

//sessions
routes.use("/session", sessionRouter);

//routes system
routes.use("/users", AuthAdmin, AuthUser, usersRouter);
routes.use("/admin", AuthAdmin, adminRouter);
routes.use("/stores", AuthAdmin, storesRouter);
routes.use("/menu", AuthAdmin, menuRouter);
routes.use("/profiles", AuthAdmin, profileRouter);

export default routes;
