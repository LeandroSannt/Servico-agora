import Router from 'express'
import AdminController from '../controllers/adminController'

const adminRouter = Router()

const adminController = new AdminController()

adminRouter.post('/',adminController.post)

adminRouter.post('/create-user-store',adminController.createUserStore)

export default adminRouter

