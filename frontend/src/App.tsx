import React from 'react';
import SignInUser from './pages/SignInUser';
import SignInAdmin from './pages/SignInAdmin';
import GlobalStyle  from './styles/Global';

import {AuthProvider} from './context/AuthContext';

function App() {
  return (
    <>
    <AuthProvider>

    <SignInUser/>
    {/* <SignInAdmin/> */}
    </AuthProvider>

      <GlobalStyle/>
     
    </>
  );
}

export default App;
