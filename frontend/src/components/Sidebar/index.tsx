import React from "react";
import {Container,Content} from './styles'

import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiXCircle,
} from 'react-icons/fi';

import {MdExitToApp} from 'react-icons/md'

import {GiHamburgerMenu} from 'react-icons/gi'

import LinkPages from '../../components/LinkPages'

const Sidebar: React.FC = () => {
  const arr = [
  {active:true,label:'saved',link:"/page1",iconName:"action",c:'1'},
  {active:true,label:'saved',link:"/page2",iconName:"comedy",c :'2'},
  {active:true,label:'Profiles',link:"/page3",iconName:"documentary",c:'3'}]

  return(

    <>
    <Container className="sidebar active ">

      <div className="logo_content ">  
          <div className="logo">
          <FiXCircle size={30}/>
              <div className="logo_name">Serviço agora</div>
          </div>
          <i className='bx bx-menu' id="btn" ></i>

      </div>
      <LinkPages list = {arr}/>

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

    </Container>
   

  </>
  )
}

export default Sidebar
