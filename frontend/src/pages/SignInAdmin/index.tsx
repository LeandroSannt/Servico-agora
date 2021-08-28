import React, {InputHTMLAttributes,useCallback,useRef,useContext,useEffect,useState} from 'react';
import {Container,Content,Background} from './styles'
import Input from '../../components/Input'
import Button from '../../components/Button'

import {FiLogIn,FiMail,FiLock} from 'react-icons/fi'
import { TiArrowRight } from "react-icons/ti";


import {Form} from "@unform/web"
import {FormHandles} from '@unform/core'

import * as Yup from 'yup'

import getValidationErrors from '../../utils/getValidationErros'

const SignInAdmin: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleSubmit = useCallback(async(data:void) =>{

    try{
      const schema = Yup.object().shape({
        email:Yup.string().required('E-mail obrigatorio').email("Digite um e-mail valido"),
        password:Yup.string().required('Senha obrigatoria')
      })

      await schema.validate(data,{
        abortEarly:false
      })

    }catch(err){

    }

  }, [])

  return (
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
          <Form onSubmit={handleSubmit}>
            <Input  name="email" icon={FiMail} type="text" placeholder="USUÁRIO"/>
            <Input  name="password" icon={FiLock} type="password" placeholder="SENHA"/>
            <Button type="submit" icon={TiArrowRight}>Entrar </Button>
          </Form>
            <p>Problemas com o acesso.<span>clique aqui!</span></p>
        </div>
      </Content>
    </Container>
    </>
  )
}

export default SignInAdmin
