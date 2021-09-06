import React from "react";
import {RouteProps as ReactDomRouteProps, Route as ReactDOMRoute,Redirect} from 'react-router-dom'

import {useAuth} from '../hooks/AuthContext'

interface RoutesProps extends ReactDomRouteProps {
  isPrivateAdmin?: boolean;
  component: React.ComponentType
}

const Route: React.FC<RoutesProps> = ({isPrivateAdmin = false,
  component: Component,
   ...rest
  }) => {
  const { admin } = useAuth();
  console.log(admin)

  return (
    <ReactDOMRoute 
    {...rest} 
    render= {({location}) => {
      return isPrivateAdmin === !!admin ? (
        <Component/>
      ) : (
        <Redirect to ={{pathname: isPrivateAdmin ? '/login' : '/dashboard/Admin', state:{from:location}}}/>
      )
    }}
    />
  )
  }


  export default Route;
