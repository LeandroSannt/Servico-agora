import React from "react";
import {RouteProps as ReactDomRouteProps, Route as ReactDOMRoute,Redirect} from 'react-router-dom'

import {useAuth} from '../hooks/AuthContext'

interface RoutesProps extends ReactDomRouteProps {
  isPrivate?: boolean;
  component: React.ComponentType
}

const Route: React.FC<RoutesProps> = ({isPrivate = false,
  component: Component,
   ...rest
  }) => {
  const { admin } = useAuth();
  console.log(admin)

  return (
    <ReactDOMRoute 
    {...rest} 
    render= {({location}) => {
      return isPrivate === !!admin ? (
        <Component/>
      ) : (
        <Redirect to ={{pathname: isPrivate ? '/session/login-Admin' : '/dashboard', state:{from:location}}}/>
      )
    }}
    />
  )
  }


  export default Route;
