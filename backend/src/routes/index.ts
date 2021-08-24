import {Router} from 'express'
import storesRouter from './stores.routes'
import adminRouter from './admin.routes'
import sessionRouter from './session.routes'
import profileRouter from './profile.routes'

//middlewares
import {authAdmin, AuthUser} from '../middlewares/ensuredAuthenticated'
import { UnauthorizedUser } from '../middlewares/UnauthorizedUser'

const routes = Router()

//sessions
routes.use('/session',sessionRouter)

//routes system
routes.use('/admin',adminRouter)
routes.use('/stores',storesRouter)
routes.use('/profiles',AuthUser,UnauthorizedUser,profileRouter)

export default routes;
