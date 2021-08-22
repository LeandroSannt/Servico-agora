import { StoreController } from '../controllers/storeController'
import multer from 'multer'
import uploadConfig from '../config/upload'
import Router from 'express'

const storesRouter = Router()

const upload = multer(uploadConfig)

const StoresController = new StoreController()

storesRouter.get('/',StoresController.list)
storesRouter.post('/',upload.single('avatar_store'),StoresController.post)
storesRouter.get('/:id',StoresController.show)
storesRouter.put('/:id',StoresController.update)
storesRouter.delete('/:id',StoresController.delete)

export default storesRouter
