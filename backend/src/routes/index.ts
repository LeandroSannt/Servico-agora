import {Router} from 'express'
import storesRouter from './stores.routes'

const routes = Router()

routes.use('/stores',storesRouter)

export default routes;
