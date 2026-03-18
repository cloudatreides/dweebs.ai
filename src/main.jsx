import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { CharacterProvider } from './context/CharacterContext'
import { TierProvider } from './context/TierContext'
import { Analytics } from '@vercel/analytics/react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TierProvider>
        <CharacterProvider>
          <App />
          <Analytics />
        </CharacterProvider>
      </TierProvider>
    </AuthProvider>
  </StrictMode>,
)
