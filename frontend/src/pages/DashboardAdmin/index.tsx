import React from "react";
import {Container} from './styles'

import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiXCircle,
} from 'react-icons/fi';

const DashboardUser: React.FC = () => {
  return(

    <>
    <Container className="sidebar active">


      

<div className="logo_content">
          <div className="logo">
            <FiAlertCircle size={30}/>
              <div className="logo_name">CodingLab</div>
          </div>
      </div>
      <ul className="nav_list">
        
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">User</span>
          </a>
          <span className="tooltip">User</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">Messages</span>
          </a>
          <span className="tooltip">Messages</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">Analytics</span>
          </a>
          <span className="tooltip">Analytics</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">File Manager</span>
          </a>
          <span className="tooltip">File Manager</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">Order</span>
          </a>
          <span className="tooltip">Order</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">Saved</span>
          </a>
          <span className="tooltip">Saved</span>
        </li>
        <li>
          <a href="#">
          <FiAlertCircle size={30}/>
            <span className="links_name">Settings</span>
          </a>
          <span className="tooltip">Settings</span>
        </li>
      </ul>

      <div className="profile_content">
        <div className="profile">
          <div className="profile_details">
            
            <div className="name_job">
              <div className="name">Leandro Santos</div>
              <div className="job">Web Designer</div>
            </div>
          </div>
          <i className='bx bx-log-out' id="log_out" ></i>
        </div>
      </div>

    </Container>
    <div className="home_content">
      <div className="text">Home Content</div>
    </div>

  </>
  )
}

export default DashboardUser
