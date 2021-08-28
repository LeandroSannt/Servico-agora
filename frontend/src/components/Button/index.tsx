import React, {ButtonHTMLAttributes} from 'react';
import {Container} from './styles';
import {IconBaseProps} from 'react-icons'


interface ButtonProps extends ButtonHTMLAttributes<HTMLInputElement> {

  icon?: React.ComponentType<IconBaseProps>;
}

const Button: React.FC<ButtonProps>= ({children, icon:Icon,...rest}) => {

  return (
    <>
    <Container  type="button" {...rest}>
      {children}

      {Icon &&  <Icon size={20}/>}
    </Container>
    </>
    
  )

}

export default Button
