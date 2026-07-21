import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.jsx'
import { ClerkAccountBridge } from './providers/ClerkAccountBridge.jsx'
import './index.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const application = clerkPublishableKey ? (
  <ClerkProvider
    publishableKey={clerkPublishableKey}
    signInUrl="https://portail.fiip.fr/sign-in"
    signUpUrl="https://portail.fiip.fr/sign-up"
    afterSignOutUrl="https://fiip.fr/"
  >
    <ClerkAccountBridge><App /></ClerkAccountBridge>
  </ClerkProvider>
) : <App />

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {application}
  </React.StrictMode>,
)
