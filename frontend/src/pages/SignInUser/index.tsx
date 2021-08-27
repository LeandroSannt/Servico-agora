import React from 'react'
import {Container,Content,Background} from './styles'

import logo from '../../assets/logo.png'


const SignInUser: React.FC = () => {


  return (
    <>
    <Container>
      <Background></Background>
      <Content>
        <img src={logo} alt="Logo" />

        <div>
          <div>
            <h2>Login</h2>
            <p>Preencha suas credencias corretamentes para realizar seu acesso</p>
          </div>
          <form>
            <input type="text" placeholder="USUÁRIO"/>
            <input type="password" placeholder="SENHA"/>
          
            <button type="submit">Entrar</button>
          </form>
            <p>Problemas com o acesso.<span>clique aqui!</span></p>
        </div>
      </Content>
    </Container>
    </>
  )
}

export default SignInUser
