import styled from 'styled-components'
import bikeimage from '../../assets/bikebackground.jpg'

export const Container = styled.div`

  height: 100vh;
  display:flex;
  align-items:stretch;

`

export const Content = styled.div`

  width: 100%;
  max-width:400px;
  
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;

  margin: 0 4rem;

  img


  form{
    display: flex;
    flex-direction: column;
  }


`

export const Background = styled.div`

  flex: 1;
  background:url(${bikeimage})no-repeat center ;
  background-size:cover
  
`
