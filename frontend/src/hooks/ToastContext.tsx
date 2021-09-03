import React,{createContext,useCallback,useState,useContext} from 'react'

import { v4 as uuid } from "uuid"


interface ToastContextData{
  addToast():void;
  removeToast():void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const ToastProvider: React.FC = ({children}) => {

  const addToast = useCallback(() => {
    console.log('add')
  },[])

  const removeToast = useCallback(() => {
    console.log('remove')
  },[])


  return (
    <ToastContext.Provider value ={{addToast,removeToast}}>
      {children}
    </ToastContext.Provider> 
  )
}

function useToast() {
  const context = useContext(ToastContext)

  if(!context) {
    throw new Error('useToast must be used ToastProvider')

  }

  return context
}

export {ToastProvider, useToast}
