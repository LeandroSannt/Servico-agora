import {Router} from 'express'
import { SessionUserController } from '../controllers/sessionUserController'

const sessionUserRouter = Router()

const sessionUserController = new SessionUserController()

sessionUserRouter.post('/login', sessionUserController.post)


export default sessionUserRouter
