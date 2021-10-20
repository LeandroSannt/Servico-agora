import { Router } from "express";
import storesRouter from "@modules/stores/infra/http/routes/stores.routes";
import adminRouter from "@modules/admins/infra/http/routes/admin.routes";
import profileRouter from "@modules/profiles/infra/http/routes/profile.routes";
import menuRouter from "@modules/admins/infra/http/routes/menus.routes";
import sessionRouter from "@shared/infra/http/routes/session.routes";

//middlewares
import { AuthUser } from "../middlewares/ensuredAuthenticated";
import { UnauthorizedUser } from "@modules/users/infra/http/middlewares/UnauthorizedUser";

const routes = Router();

//sessions
routes.use("/session", sessionRouter);

//routes system
routes.use("/admin", adminRouter);
routes.use("/stores", storesRouter);
routes.use("/menu", menuRouter);
routes.use("/profiles", AuthUser, UnauthorizedUser, profileRouter);

export default routes;
