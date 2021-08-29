import React, {InputHTMLAttributes,useEffect,useRef,useState,useCallback} from 'react';
import {Container,Error} from './styles'
import {IconBaseProps} from 'react-icons'
import {FiAlertCircle} from 'react-icons/fi'

import {useField} from '@unform/core'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  icon?: React.ComponentType<IconBaseProps>;
}

const Input: React.FC<InputProps> = ({name,icon:Icon, ...rest}) => {
  //pega o valor de um input especifoco e botando HTMLinputElement pega as propriedades do input tipo value
  const inputRef = useRef<HTMLInputElement>(null)
  const {fieldName,defaultValue,error,registerField} = useField(name)

  const [isFocused,setIsFocused] = useState(false)
  const [isFilled,setIsFilled] = useState(true)

  //pegando valor do input e verificando se tem algo ou não pq ele vai começar nulo

  const handleFocusInput = useCallback (()=>{
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

  //pegando o valor de todos os inputs
  useEffect(() => {
    registerField({
      name:fieldName,
      ref:inputRef.current,
      path:"value"
    })
  }, [fieldName,registerField])

  return(
    <Container isErrorRed={!!error} isFilled= {isFilled} isFocused={isFocused} >
    {Icon && <Icon size ={20}/> }
    <input 
      onFocus={handleFocusInput}  
      onBlur={handleInputBlur}
      defaultValue={defaultValue} 
      ref={inputRef} 
      className="color" 
      {...rest} />

      {error && 
        <Error title={error}>
          <FiAlertCircle color="red" size={20}/>
        </Error>}
  </Container>
  )
  }

export default Input
