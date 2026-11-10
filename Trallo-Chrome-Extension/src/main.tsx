import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles/tokens.css'
import { TripProvider } from './state/TripProvider'
import { App } from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TripProvider>
      <App />
    </TripProvider>
  </StrictMode>,
)
