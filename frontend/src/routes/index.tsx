import React from "react";
import Route from './Route';
import SignInAdmin from "../pages/SignInAdmin";
import SignInUser from "../pages/SignInUser";
import Dashboard from '../pages/Dashboard'


import {Switch} from 'react-router-dom'

const Routes: React.FC = () => (

  <Switch>
    <Route path='/' exact component ={SignInUser}/>
    <Route path='/session/login-Admin' exact component ={SignInAdmin}/>
    <Route path='/dashboard' exact component ={Dashboard} isPrivate  />

  </Switch>

)

export default Routes;
