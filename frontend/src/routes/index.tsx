import React from "react";
import SignInAdmin from "../pages/SignInAdmin";
import SignInUser from "../pages/SignInUser";

import {Switch,Route} from 'react-router-dom'

const Routes: React.FC = () => (

  <Switch>
    <Route path='/' exact component ={SignInUser}/>
    <Route path='/session/login-Admin' exact component ={SignInAdmin}/>

  </Switch>

)

export default Routes;
