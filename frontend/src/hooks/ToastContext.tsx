import React,{createContext,useCallback,useState,useContext} from 'react'
import ToastContainer from '../components/ToastContainer'

import { v4 as uuid } from "uuid"

export interface ToastMessage{
  type:'success' | 'error' | 'info';
  description?:string;
  title:string;
  id:string;

}


interface ToastContextData{
  addToast(message:Omit<ToastMessage,'id'>):void;
  removeToast(id:string):void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const ToastProvider: React.FC = ({children}) => {
  const [messages,setMessages] = useState<ToastMessage[]>([])

  const addToast = useCallback(({type,title,description}:Omit<ToastMessage,'id'>) => {
    const id = uuid();

    const toast = {
      id,
      type,
      title,
      description
    }

    setMessages(oldMessages => [...oldMessages,toast])
  },[])

  const removeToast = useCallback((id:string) => {
    setMessages(state => state.filter(message => message.id !== id))
  },[])


  return (
    <ToastContext.Provider value ={{addToast,removeToast}}>
      {children}
      <ToastContainer messages={messages}/>
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
