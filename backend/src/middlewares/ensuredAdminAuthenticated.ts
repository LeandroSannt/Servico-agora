import {Request,Response,NextFunction} from 'express'
import {verify} from 'jsonwebtoken'

import authconfig from '../config/auth'

interface tokenPayload{
  iat:number
  exp:number
  sub:string
}

export default function ensuredAdminAuthenticated(request:Request,response:Response,next:NextFunction): void{

  const authHeader = request.headers.authorization

  if(!authHeader){
    throw new Error('JWT is missing')
  }

  const [,token] = authHeader.split(' ')

  try{
  const decoded = verify(token, authconfig.jwt.secret)

  const { sub } = decoded as tokenPayload

  request.admin = {
    id :sub
  }


  return next()

  }catch{
    throw new Error('Invalid JWT token')
  }
}
