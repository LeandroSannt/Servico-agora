import {Router} from 'express'
import { SessionController } from '../controllers/sessionController'

import { UnauthorizedUser } from '../middlewares/UnauthorizedUser'


const sessionsRouter = Router()

const sessionController = new SessionController()

sessionsRouter.post('/admin/login', sessionController.postAdmin)
sessionsRouter.post('/user/login', sessionController.postUser)


export default sessionsRouter
