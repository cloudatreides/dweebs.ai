import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { CharacterProvider } from './context/CharacterContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CharacterProvider>
        <App />
      </CharacterProvider>
    </AuthProvider>
  </StrictMode>,
)
