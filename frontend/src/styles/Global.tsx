import {createGlobalStyle} from 'styled-components'

export default createGlobalStyle `
:root{
  font-size:60% ;
}

@media(min-width:700px){
    :root{font-size: 62.5%;}
}

*{
    margin:0;
    padding: 0;
    box-sizing: border-box;
    outline: 0;
}


body{ 
    background: #fff;
    color: #312e38;
    position:relative;
    min-height: 100vh;
    width: 100%;
    overflow: hidden;
}


body,input,button{
    font-family: 'Roboto', sans-serif;
    font: 1.6rem;
    font-weight: normal;
}


h1, h2, h3, h4, h5, h6,strong{
    font-weight: 500;
}

button{
    cursor: pointer
}

`
