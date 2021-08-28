import React, {InputHTMLAttributes,useEffect,useRef,useState,useCallback} from 'react';
import {Container,Error} from './styles'
import {IconBaseProps} from 'react-icons'
import {FiAlertCircle} from 'react-icons/fi'

import {useField} from '@unform/core'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  icon?: React.ComponentType<IconBaseProps>;
}

const Input: React.FC<InputProps>= ({name,icon:Icon, ...rest}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const {fieldName,defaultValue,error,registerField} = useField(name)

  console.log(useField)


  const [isFocused,setIsFocused] = useState(false);
  const [isFilled,setIsFilled] = useState(true)

  const handleFocusInput = useCallback(() =>{
    setIsFocused(true)
  },[])


  const handleInputBlur =useCallback(() =>{
    setIsFocused(false)

    if(inputRef.current?.value){
      setIsFilled(true)
    }else{
      setIsFilled(false)
    }

  },[])

  return(
    <>
    <Container  isFocused={isFocused} isFilled={isFilled}>
    {Icon &&  <Icon size={20}/>}
    <input 
      onFocus={handleFocusInput}
      onBlur={handleInputBlur}
      defaultValue={defaultValue}
      ref={inputRef}
      name="email"
      type="text"
      placeholder="USUÁRIO"
      {...rest}
      />

      <Error>
        <FiAlertCircle/>
      </Error>

    </Container>
    </>
  )
}
export default Input
