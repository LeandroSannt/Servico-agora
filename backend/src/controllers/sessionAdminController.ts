import { Request, Response } from "express";
import AuthenticatedAdminService from '../services/AuthenticatedAdminService'


class SessionAdminController {
  async post(request:Request, response:Response){
      const {email,password} = request.body

      const authenticateUser = new AuthenticatedAdminService()

      const {admin, token} = await authenticateUser.execute({
        email,
        password
      })

      delete admin.password

      return response.json({admin,token})
  }
}

export {SessionAdminController}
