import React from "react";
import {Switch,BrowserRouter} from 'react-router-dom'

import RouteAdmin from './RouteAdmin';
import RouteUser from './RouteUser';

import SignInAdmin from "../pages/SignInAdmin";
import DashboardAdmin from "../pages/DashboardAdmin";

import SignInUser from "../pages/SignInUser";
import DashboardUser from "../pages/DashboardUser";

import Sidebar from '../components/Sidebar'


const Routes: React.FC = () => (
  <BrowserRouter>
  <Switch>
    {/* Rotas Admin */}
    <RouteAdmin path='/login' exact component ={SignInAdmin}/>
    <RouteAdmin path='/dashboard/Admin' exact component ={Sidebar} isPrivateAdmin  />
  
    {/* Rotas User */}
    <RouteUser path='/' exact component ={SignInUser}/>
    <RouteUser path='/dashboard/User' exact component ={Sidebar} isPrivateUser  />
  </Switch>
  </BrowserRouter>

)

export default Routes;
