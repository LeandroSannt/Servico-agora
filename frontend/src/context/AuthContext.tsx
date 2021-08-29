import React,{createContext,useCallback} from 'react'

import api from '../services/api'

interface SignInCredentials{
  email:string;
  password:string;
}

interface AuthContextState{
  name:string;
  signIn(credentials:SignInCredentials):Promise<void>;
  signInUser(credentials:SignInCredentials):Promise<void>;
}

//iniciando um contexto vazio precisa colocar o as e o nome da interface
const AuthContext = createContext<AuthContextState>({} as AuthContextState)

const AuthProvider:React.FC = ({children}) => {

  const signIn = useCallback(async ({email,password}) => {
    const response = await api.post('/session/admin/login',{
      email,
      password
    })

    console.log(response.data)
  }, [])

  const signInUser = useCallback(async ({email,password}) => {
    const response = await api.post('/session/user/login',{
      email,
      password
    })

    console.log(response.data)
  }, [])

  return (
    <AuthContext.Provider value ={{name:"leandro",signInUser, signIn}}>
     {children}
     </AuthContext.Provider>
  )
}

export {AuthProvider,AuthContext}
