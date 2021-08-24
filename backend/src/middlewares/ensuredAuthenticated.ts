import {Request,Response,NextFunction} from 'express'
import {verify} from 'jsonwebtoken'
import AppError from '../errors/AppErros'


import authconfig from '../config/auth'

interface tokenPayload{
  iat:number
  exp:number
  sub:string
}

function authAdmin(request:Request,response:Response,next:NextFunction): void{

  const authHeader = request.headers.authorization

  if(!authHeader){
    throw new AppError('JWT is missing')
  }

  const [,token] = authHeader.split(' ')

  try{
  const decoded = verify(token, authconfig.jwt.secret)

  const { sub } = decoded as tokenPayload

  request.admin = {
    permissions:sub,
    email:sub,
    id :sub
  }


  return next()

  }catch{
    throw new Error('Invalid JWT token')
  }
}

 function AuthUser(request:Request,response:Response,next:NextFunction): void{

  const authHeader = request.headers.authorization

  if(!authHeader){
    throw new AppError('JWT is missing')
  }

  const [,token] = authHeader.split(' ')

  try{
  const decoded = verify(token, authconfig.jwt.secret)

  const { sub } = decoded as tokenPayload

  request.user = {
    id :sub,
    //email:sub
  }

  return next()

  }catch{
    throw new Error('Invalid JWT token')
  }
}

export {authAdmin,AuthUser}
