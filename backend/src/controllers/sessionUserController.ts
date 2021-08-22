import { Request, Response } from "express";
import AuthenticatedUserService from '../services/AuthenticatedUserService'


class SessionUserController {
  async post(request:Request, response:Response){
      const {email,password} = request.body

      const authenticateUser = new AuthenticatedUserService()

      const {user, token} = await authenticateUser.execute({
        email,
        password
      })

      delete user.password

      return response.json({user,token})
  }
}

export {SessionUserController}
