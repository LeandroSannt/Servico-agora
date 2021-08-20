import { StoreController } from '../controllers/storeController'
import Router from 'express'

const storesRouter = Router()

const StoresController = new StoreController()

storesRouter.get('/',StoresController.list)
storesRouter.post('/',StoresController.post)
storesRouter.get('/:id',StoresController.show)
storesRouter.put('/:id',StoresController.update)
storesRouter.delete('/:id',StoresController.delete)

export default storesRouter
