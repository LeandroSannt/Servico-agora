import {Router} from 'express'
import { SessionAdminController } from '../controllers/sessionAdminController'

const sessionsAdminRouter = Router()

const sessionAdminController = new SessionAdminController()

sessionsAdminRouter.post('/login', sessionAdminController.post)


export default sessionsAdminRouter
