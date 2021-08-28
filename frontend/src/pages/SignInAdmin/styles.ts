import styled from 'styled-components'
import bikeimage from '../../assets/bikebackground.jpg'
import {shade} from 'polished'

export const Container = styled.div`

  height: 100vh;
  display:flex;

`

export const Content = styled.div`

  width: 100%;
  max-width:500px;

  display: grid;
  grid-template-rows: 200px 400px;
  place-items: center;

  img{
    display: flex;
  }

  div{
    max-width:85%;
    div{
      margin-bottom: .8rem;
      max-width: 90%;

        h1{
          margin-bottom: .8rem;
          font-size: 3rem;
          font-weight: bold;
        }

        p{
          margin-bottom: 1.6rem;
          font-size:1.6rem;
          color:#898080;
        }
    }
    p{
      margin-top: .8rem;
      font-size: 1.6rem;
        span{
          margin-left: .3rem;
          color:#240669;
          cursor: pointer;

          &:hover{
            color: ${shade(0.5, '#240669')};
          }
        }
      
    }
  }

  form{
    display: flex;
    flex-direction: column;

    input{
      background: #232129 ;
      border-radius: 4px;
      border:1px solid #898080;
      padding: 18px;
      width: 100%;
      font-size: 1.8rem;
      
      display: flex;
      align-items: center;

      flex: 1;
      background: transparent !important;

      & + input {
        margin-top: 20px;
      }
    }

    button{
      background: #240669 ;
      height: 56px;
      border-radius: 10px;
      border:0;
      color: white;
      font-weight: 500;
      font-size: 1.8rem;
      padding:0 16px;
      width: 100%;
      margin-top: 16px;
      transition:background-color 0.2s;
      text-align: center;

      &:hover{
          background: ${shade(0.2, '#240669')};
        }
    }
  }

`

export const Background = styled.div`

  flex: 1;
  background:url(${bikeimage})no-repeat center ;
  background-size:cover
  
`
