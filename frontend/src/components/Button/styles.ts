import styled from "styled-components";
import {shade} from 'polished'

export const Container = styled.button`
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
      cursor: pointer;

      display:flex;
      align-items: center;
      justify-content: center;

       /* svg {
         margin-left: 5px;
       } */

      &:hover{
          background: ${shade(0.2, '#240669')};
        }
    



`


