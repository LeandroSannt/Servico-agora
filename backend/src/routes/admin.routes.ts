import Router from 'express'
import AdminController from '../controllers/adminController'

import {authAdmin} from '../middlewares/ensuredAuthenticated'

const adminRouter = Router()

const adminController = new AdminController()

adminRouter.post('/',adminController.post)

adminRouter.post('/create-user-store',authAdmin,adminController.createUserStore)

export default adminRouter

