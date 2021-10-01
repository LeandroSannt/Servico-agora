/* eslint-disable react/require-default-props */
import react from 'react';
import {
  RouteProps as ReactDomRouteProps,
  Route as ReactDOMRoute,
  Redirect,
} from 'react-router-dom';

import { useAuth } from '../hooks/AuthContext';

interface RoutesProps extends ReactDomRouteProps {
  isPrivateUser?: boolean;
  component: React.ComponentType;
}

const RouteUser: React.FC<RoutesProps> = ({
  isPrivateUser = false,
  component: Component,
  ...rest
}) => {
  const { user } = useAuth();

  return (
    <ReactDOMRoute
      {...rest}
      render={({ location }) => {
        return isPrivateUser === !!user ? (
          <Component />
        ) : (
          <Redirect
            to={{
              pathname: isPrivateUser ? '/' : '/dashboard/User',
              state: { from: location },
            }}
          />
        );
      }}
    />
  );
};

export default RouteUser;
