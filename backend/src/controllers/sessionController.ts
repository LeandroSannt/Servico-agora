import { Request, Response } from "express";
import AuthenticatedService from '../services/AuthenticatedService'


class SessionController {
  async postAdmin(request:Request, response:Response){
      const {email,password} = request.body

      const authenticateUser = new AuthenticatedService()

      const {admin, token} = await authenticateUser.execute({
        email,
        password
      })

      delete admin.password

      return response.json({admin,token})
  }

  async postUser(request: Request, response: Response){
    const {email,password} = request.body

      const authenticateUser = new AuthenticatedService()

      const {user, token} = await authenticateUser.authUser({
        email,
        password
      })

      delete user.password

      return response.json({user,token})
  }
}

export {SessionController}
