import React from 'react';
import {Container} from './styles'

import Toast from './Toast'

import {ToastMessage,useToast} from '../../hooks/ToastContext'

// import {useTransition} from 'react-spring'

interface ToastContainerProps {
  messages:ToastMessage[]
}

const ToastContainer: React.FC<ToastContainerProps> = ({messages}) => {

  // const messagesWithTransations = useTransition(
  //   messages,
  //   (message) => message.id,
  //   {
  //     from:{right:'-120%'},
  //     enter: {right:'0%'},
  //     leave: {right:"-120%"}
  //   },
  //   );
  return ( 
    
    <Container>
      {messages.map((message)=>(
        <Toast key ={message.id} message={message}></Toast>

      ))}

      
    </Container>
  )
}

export default ToastContainer
