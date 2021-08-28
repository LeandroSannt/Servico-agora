import React from 'react';
import SignInUser from './pages/SignInUser';
import SignInAdmin from './pages/SignInAdmin';
import GlobalStyle  from './styles/Global';


function App() {
  return (
    <>
    <GlobalStyle/>
    <SignInAdmin/>
    {/* <SignInUser/> */}
     
    </>
  );
}

export default App;
