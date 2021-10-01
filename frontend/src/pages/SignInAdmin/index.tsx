import react, { useCallback, useRef } from 'react';
import { FiMail, FiLock } from 'react-icons/fi';
import { Form } from '@unform/web';
import { FormHandles } from '@unform/core';
import * as Yup from 'yup';
import { Container, Content, Background } from './styles';
import Input from '../../components/Input';
import Button from '../../components/Button';

import { useAuth } from '../../hooks/AuthContext';
import { useToast } from '../../hooks/ToastContext';

import getValidationErrors from '../../utils/getValidationErros';

interface SignInFormData {
  email: string;
  password: string;
}

// import getValidationErrors from '../../utils/getValidationErros'

const SignInAdmin: React.FC = () => {
  const formRef = useRef<FormHandles>(null);

  const { signIn } = useAuth();

  const { addToast } = useToast();

  // função para validar os campos do formulario
  const handleSubmit = useCallback(
    async (data: SignInFormData) => {
      try {
        formRef.current?.setErrors({});

        const schema = Yup.object().shape({
          email: Yup.string()
            .required('E-mail obrigatorio')
            .email('Digite um e-mail valido'),
          password: Yup.string().required('Senha obrigatoria'),
        });

        await schema.validate(data, {
          abortEarly: false,
        });
        await signIn({
          email: data.email,
          password: data.password,
        });
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err);
          formRef.current?.setErrors(errors);

          return;
        }
        addToast({
          title: 'Erro na autenticação',
          type: 'error',
          description: 'ocorreu um erro ao fazer login, cheque as credenciais',
        });
      }
    },
    [addToast, signIn],
  );

  return (
    <>
      <Container>
        <Background />
        <Content>
          <h1>ADMINISTRADOR</h1>

          <div>
            <div>
              <h1>Login</h1>
              <p>
                Preencha suas credencias corretamentes para realizar seu acesso
              </p>
            </div>
            <Form ref={formRef} onSubmit={handleSubmit}>
              <Input name="email" icon={FiMail} placeholder="E-mail" />
              <Input
                name="password"
                icon={FiLock}
                placeholder="Senha"
                type="password"
              />
              <Button type="submit">Entrar</Button>
            </Form>
            <p>
              Problemas com o acesso.<span>clique aqui!</span>
            </p>
          </div>
        </Content>
      </Container>
    </>
  );
};

export default SignInAdmin;
