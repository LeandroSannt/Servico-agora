import React, {useCallback,useRef,useContext}  from 'react';
import {Container,Content,Background} from './styles'
import {FiMail,FiLock} from 'react-icons/fi'

import {Form} from "@unform/web"
import logo from '../../assets/logo.png'
import Input from '../../components/Input'
import Button from '../../components/Button'

import {AuthContext} from '../../context/AuthContext';

import getValidationErrors from '../../utils/getValidationErros'

import {FormHandles} from '@unform/core'

import * as Yup from 'yup'

interface SignInFormData{
  email: string
  password: string
}


const SignInUser: React.FC = () => {
  const formRef= useRef<FormHandles>(null)

  const {signInUser} = useContext(AuthContext)

//função para validar os campos do formulario
 const handleSubmit= useCallback(async(data:SignInFormData) =>{
    try{

      formRef.current?.setErrors({});

      const schema = Yup.object().shape({
        email:Yup.string().required('E-mail obrigatorio').email('Digite um e-mail valido'),
        password:Yup.string().required('Senha obrigatoria')
      })

      await schema.validate(data,{
        abortEarly:false
      })
      signInUser({
        email:data.email,
        password:data.password
      })
    }catch(err){
      const errors = getValidationErrors(err)
      formRef.current?.setErrors(errors);
    }
  },[signInUser])

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
          <Input name="email" icon={FiMail}  placeholder="E-mail" />
          <Input name="password" icon={FiLock} placeholder="Senha" type="password" />
          <Button type="submit">Entrar</Button>
          </Form>
            <p>Problemas com o acesso.<span>clique aqui!</span></p>
        </div>
      </Content>
    </Container>
    </>
  )
}

export default SignInUser
