/* eslint-disable @typescript-eslint/ban-types */
import react, { createContext, useCallback, useContext, useState } from 'react';

import api from '../services/api';

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthContextState {
  admin: Object;
  user: Object;
  signIn(credentials: SignInCredentials): Promise<void>;
  signInUser(credentials: SignInCredentials): Promise<void>;
}

interface AuthStateUser {
  token: string;
  user: Object;
}

interface AuthStateAdmin {
  token: string;
  admin: Object;
}

// iniciando um contexto vazio precisa colocar o as e o nome da interface
const AuthContext = createContext<AuthContextState>({} as AuthContextState);

const AuthProvider: React.FC = ({ children }) => {
  const [dataUser, setDataUser] = useState<AuthStateUser>(() => {
    const token = localStorage.getItem('@Servico-agora:tokenUser');
    const user = localStorage.getItem('@Servico-agora-user');

    if (token && user) {
      return { token, user: JSON.parse(user) };
    }

    return {} as AuthStateUser;
  });

  const signInUser = useCallback(async ({ email, password }) => {
    const response = await api.post('/session/user/login', {
      email,
      password,
    });

    const { token, user } = response.data;

    localStorage.setItem('@Servico-agora:tokenUser', token);
    localStorage.setItem('@Servico-agora-user', JSON.stringify(user));

    setDataUser({ token, user });
  }, []);

  const [dataAdmin, setDataAdmin] = useState<AuthStateAdmin>(() => {
    const token = localStorage.getItem('@Servico-agora:tokenAdmin');
    const admin = localStorage.getItem('@Servico-agora-admin');

    if (token && admin) {
      return { token, admin: JSON.parse(admin) };
    }

    return {} as AuthStateAdmin;
  });

  const signIn = useCallback(async ({ email, password }) => {
    const response = await api.post('/session/admin/login', {
      email,
      password,
    });

    const { token, admin } = response.data;

    localStorage.setItem('@Servico-agora:tokenAdmin', token);
    localStorage.setItem('@Servico-agora-admin', JSON.stringify(admin));

    setDataAdmin({ token, admin });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin: dataAdmin.admin,
        user: dataUser.user,
        signInUser,
        signIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function useAuth(): AuthContextState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('insira o authprovider ao redor do seu elemento');
  }
  return context;
}

export { AuthProvider, useAuth };
