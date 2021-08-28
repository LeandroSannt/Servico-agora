import React from 'react'
import {Container,Content,Background} from './styles'

const SignInAdmin: React.FC = () => {

  return (
    <>
    <>
    <Container>
      <Background></Background>
      <Content>
        <h1>ADMINISTRADOR</h1>

        <div>
          <div>
            <h1>Login</h1>
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
    </>
  )
}

export default SignInAdmin
