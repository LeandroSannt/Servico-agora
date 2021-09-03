import React from 'react';
import SignInUser from './pages/SignInUser';
import SignInAdmin from './pages/SignInAdmin';
import GlobalStyle  from './styles/Global';

import AppProvider from './hooks'

import {AuthProvider} from './hooks/AuthContext';

function App() {
  return (
    <>
    <AppProvider>
      {/* <SignInUser/> */}
      <SignInAdmin/>
    </AppProvider>

    <GlobalStyle/>
     
    </>
  );
}

export default App;
