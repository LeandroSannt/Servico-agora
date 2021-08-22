import {Router} from 'express'
import storesRouter from './stores.routes'
import adminRouter from './admin.routes'
import sessionAdminRouter from './sessionAdmin.routes'
import sessionUserRouter from './sessionUser.routes'
import profileRouter from './profile.routes'


//middlewares
import authAdmin from '../middlewares/ensuredAdminAuthenticated'
import authUser from '../middlewares/ensuredUserAuthenticated'

const routes = Router()

//sessions
routes.use('/session/admin',sessionAdminRouter)
routes.use("/session/user",sessionUserRouter)

//routes system
routes.use('/admin',adminRouter)
routes.use('/stores',authAdmin,storesRouter)
routes.use('/profiles',authAdmin,profileRouter)

export default routes;
