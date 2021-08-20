import {Router} from 'express'
import storesRouter from './stores.routes'
import adminRouter from './admin.routes'

const routes = Router()

routes.use('/stores',storesRouter)
routes.use('/admin',adminRouter)

export default routes;
