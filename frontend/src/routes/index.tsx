import React from "react";
import {Switch} from 'react-router-dom'

import RouteAdmin from './RouteAdmin';
import RouteUser from './RouteUser';

import SignInAdmin from "../pages/SignInAdmin";
import DashboardAdmin from "../pages/DashboardAdmin";

import SignInUser from "../pages/SignInUser";
import DashboardUser from "../pages/DashboardUser";


const Routes: React.FC = () => (

  <Switch>
    {/* Rotas Admin */}
    <RouteAdmin path='/login' exact component ={SignInAdmin}/>
    <RouteAdmin path='/dashboard/Admin' exact component ={DashboardAdmin} isPrivateAdmin  />

    {/* Rotas User */}
    <RouteUser path='/' exact component ={SignInUser}/>
    <RouteUser path='/dashboard/User' exact component ={DashboardUser} isPrivateUser  />
  </Switch>

)

export default Routes;
