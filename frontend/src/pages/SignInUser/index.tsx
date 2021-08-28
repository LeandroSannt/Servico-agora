import React, {useCallback,useRef,useContext}  from 'react';
import {Container,Content,Background} from './styles'
import {Form} from "@unform/web"
import logo from '../../assets/logo.png'


const SignInUser: React.FC = () => {
  const handleSubmit = useCallback(async(data:void) =>{
    

  }, [])


  return (
    <>
    <Container>
      <Background></Background>
      <Content>
        <img src={logo} alt="Logo" />

        <div>
          <div>
            <h1>Login</h1>
            <p>Preencha suas credencias corretamentes para realizar seu acesso</p>
          </div>
          <Form onSubmit={handleSubmit}>
            <input type="text" placeholder="USUÁRIO"/>
            <input type="password" placeholder="SENHA"/>
          
            <button type="submit">Entrar</button>
          </Form>
            <p>Problemas com o acesso.<span>clique aqui!</span></p>
        </div>
      </Content>
    </Container>
    </>
  )
}

export default SignInUser
