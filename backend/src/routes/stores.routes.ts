import { StoreController } from '../controllers/storeController'
import multer from 'multer'
import uploadConfig from '../config/upload'
import Router from 'express'

import {authAdmin,AuthUser} from '../middlewares/ensuredAuthenticated'
import { UnauthorizedUser } from '../middlewares/UnauthorizedUser'

const storesRouter = Router()

const upload = multer(uploadConfig)

const StoresController = new StoreController()

storesRouter.get('/',AuthUser,UnauthorizedUser,StoresController.list)
storesRouter.post('/',authAdmin,upload.single('avatar_store'),StoresController.post)
storesRouter.get('/:id',AuthUser,UnauthorizedUser,StoresController.show)
storesRouter.put('/:id',AuthUser,UnauthorizedUser,StoresController.update)
storesRouter.delete('/:id',AuthUser,UnauthorizedUser,StoresController.delete)

export default storesRouter
