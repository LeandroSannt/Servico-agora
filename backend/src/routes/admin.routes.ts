import Router from 'express'
import AdminController from '../controllers/adminController'

const adminRouter = Router()

const adminController = new AdminController()

adminRouter.post('/',adminController.post)

export default adminRouter

