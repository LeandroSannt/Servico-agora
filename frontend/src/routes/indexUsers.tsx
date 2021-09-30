import React from "react";
import {Switch,BrowserRouter} from 'react-router-dom'

import RouteAdmin from './RouteAdmin';
import RouteUser from './RouteUser';

import SignInAdmin from "../pages/SignInAdmin";
import DashboardAdmin from "../pages/DashboardAdmin";

import SignInUser from "../pages/SignInUser";
import DashboardUser from "../pages/DashboardUser";

import Users from '../pages/DashboardAdmin/Users'


import Sidebar from '../components/Sidebar'


const RoutesUser: React.FC = () => (
  <BrowserRouter>
    <Sidebar/>
  
  <Switch>
    {/* Rotas Admin */}
    <RouteUser path='/' exact component ={SignInUser}/>
    <RouteUser path='/dashboard/User' exact component ={Sidebar} isPrivateUser  />

  </Switch>
  </BrowserRouter>


)

export default RoutesUser;
