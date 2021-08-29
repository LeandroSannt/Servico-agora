import styled from 'styled-components'

export const Container = styled.div`

  position: relative; 

   span{
    background: #c53030;
    color: #fff !important;
    width:160px;
    padding: 8px;
    border-radius: 4px;
    font-size:14px;
    font-weight: 500;
    opacity: 0;  
      transition: 0.4s;
    position: absolute;  
     bottom:calc(100% + 12px);
    left:50%;
    transform:translateX(-50%);
    color:#312e38; 
    visibility: hidden;

     &::before{
      border-style:solid;
      border-color: #c53030 transparent;
      border-width:6px 6px 0 6px;
      top: 100%;
      position: absolute;
      left:50%;
      transform:translateX(-50%);
      content:""
    } 
  }


  &:hover span{
    opacity:1;
    visibility:visible
  }



`