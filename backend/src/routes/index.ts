import {Router} from 'express'
import storesRouter from './stores.routes'
import adminRouter from './admin.routes'
import sessionAdminRouter from './sessionAdmin.routes'

import authAdmin from '../middlewares/ensuredAdminAuthenticated'

const routes = Router()

routes.use('/stores',authAdmin,storesRouter)
routes.use('/admin',adminRouter)
routes.use('/session/admin',sessionAdminRouter)

export default routes;
