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


const Routes: React.FC = () => (
  <>
  <BrowserRouter>
    <Switch>
      {/* Rotas Admin */}
      <RouteAdmin path='/login' exact component ={SignInAdmin}/>
      <RouteUser path='/' exact component ={SignInUser}/>
      <Sidebar/>
      <Switch>
        <RouteAdmin path='/dashboard/Admin' exact component ={DashboardAdmin} isPrivateAdmin  />
        <RouteAdmin path='/dashboard/Admin/Usuarios' exact component ={Users} isPrivateAdmin  />
        <RouteUser path='/dashboard/User' exact component ={Sidebar} isPrivateUser  />
      </Switch>
    </Switch>
  </BrowserRouter>

</>

)

export default Routes;
