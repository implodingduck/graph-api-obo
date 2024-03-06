import { useState, useEffect } from 'react'
import './App.css'
import { MsalProvider } from '@azure/msal-react';

import MainContent from './MainContent';


function App({ instance }) {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Graph API OBO</h1>
      <MsalProvider instance={instance}>
        <MainContent />
      </MsalProvider>
    </>
  )
}

export default App
