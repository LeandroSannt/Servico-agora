import React, {useState,useCallback} from "react";
import {Container} from './styles'

import { CgAdidas } from "react-icons/cg";

import {MdExitToApp} from 'react-icons/md'


import LinkPages from '../../components/LinkPages'

const Sidebar: React.FC = ({children}) => {

  const [toogle,setToogle] = useState(true)

  const handleClick =useCallback(() =>{

    if(toogle === false){
      setToogle(true)
    }else{
      setToogle(false)
    }

  },[toogle])


  const arr = [
  {id:'1',active:true,label:'Usúarios',link:"/dashboard/Admin/Usuarios",isAdmin:true},
  {id:'2',active:true,label:'saved',link:"/page2",isAdmin:false},
  {id:'3',active:true,label:'Profiles',link:"/page3",isAdmin:true}]

  return(

    <>
    <Container {...(toogle ? { className: 'sidebar active' } :  { className: 'sidebar' })} >

      <div className="logo_content ">  
          <div className="logo">
          <CgAdidas size={30}/>
              <div className="logo_name">Serviço agora</div>
          </div>
          <i className='bx bx-menu' id="btn" onClick={() =>{handleClick()}} />

      </div>
      <LinkPages list = {arr} />

      <div className="profile_content">
        <div className="profile">
        
          <div className="profile_details">
          <img src="https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1170&q=80" alt="person"/>
            
            <div className="name_job">
              <div className="name">Leandro Santos</div>
              <div className="job">Web Designer</div>
            </div>
          </div>
          <MdExitToApp className='bx bx-log-out' id="log_out"/>
        </div>
      </div>

    {children}
    </Container>
   

  </>
  )
}

export default Sidebar
